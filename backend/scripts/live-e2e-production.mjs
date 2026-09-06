#!/usr/bin/env node
/**
 * Production live E2E against Railway only.
 * Host: app email/password via Supabase Auth.
 * Other roles: mint sessions via service-role generateLink + verifyOtp (no passwords).
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const API = 'https://throve-production.up.railway.app';
const HOST_EMAIL = process.env.THROVE_E2E_HOST_EMAIL || 'adeogun64@gmail.com';
const HOST_PASSWORD = process.env.THROVE_E2E_PASSWORD;
const MOD_USERNAME = process.env.THROVE_E2E_MOD || 'Abdul';
const VIEWER_USERNAME = process.env.THROVE_E2E_VIEWER || 'Dorcas';

if (!HOST_PASSWORD) {
  console.error('Set THROVE_E2E_PASSWORD');
  process.exit(1);
}

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const results = [];
function ok(step, detail = '') {
  results.push({ step, pass: true, detail });
  console.log(`PASS  ${step}${detail ? ` — ${detail}` : ''}`);
}
function fail(step, detail = '') {
  results.push({ step, pass: false, detail });
  console.error(`FAIL  ${step}${detail ? ` — ${detail}` : ''}`);
}
function assert(step, cond, detail = '') {
  if (cond) ok(step, detail);
  else fail(step, detail);
  return Boolean(cond);
}

async function api(token, path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function loginHost() {
  const { data, error } = await anon.auth.signInWithPassword({
    email: HOST_EMAIL,
    password: HOST_PASSWORD,
  });
  if (error || !data.session?.access_token) throw new Error(error?.message || 'Host login failed');
  return data.session.access_token;
}

async function mintSessionForProfileUsername(username) {
  const { data: profile, error } = await admin
    .from('profiles')
    .select('id, username, notif_live')
    .ilike('username', username)
    .maybeSingle();
  if (error || !profile) throw new Error(`Profile not found: ${username} (${error?.message || 'missing'})`);

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(profile.id);
  if (userErr || !userData.user?.email) throw new Error(`No auth email for ${username}: ${userErr?.message}`);
  const email = userData.user.email;

  let linkResult = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkResult.error) throw new Error(`generateLink ${username}: ${linkResult.error.message}`);
  const hashed = linkResult.data?.properties?.hashed_token;
  if (!hashed) throw new Error(`No hashed_token for ${username}`);

  const verify = await admin.auth.verifyOtp({ token_hash: hashed, type: 'email' });
  if (verify.error || !verify.data.session?.access_token) {
    throw new Error(`verifyOtp ${username}: ${verify.error?.message || 'no session'}`);
  }
  return {
    username: profile.username,
    userId: profile.id,
    email,
    notifLive: profile.notif_live !== false,
    token: verify.data.session.access_token,
  };
}

async function notificationsSince(token, sinceMs, types) {
  const { status, json } = await api(token, '/notifications');
  if (status !== 200 || !Array.isArray(json)) return { status, items: [] };
  const items = json.filter((n) => n.createdAt >= sinceMs - 2000 && (!types?.length || types.includes(n.type)));
  return { status, items, all: json };
}

async function endOpenLives(hostToken, hostUsername) {
  const { json } = await api(hostToken, '/live/sessions?status=live');
  const lives = Array.isArray(json) ? json.filter((s) => s.host === hostUsername || s.hostUsername === hostUsername) : [];
  for (const s of lives) {
    await api(hostToken, `/live/sessions/${s.id}/end`, { method: 'POST', body: { reason: 'host' } });
    console.log(`ended leftover live ${s.id}`);
  }
}

async function main() {
  console.log(`API ${API}`);
  const t0 = Date.now();

  const hostToken = await loginHost();
  ok('host.login');

  const { status: meStatus, json: me } = await api(hostToken, '/profiles/me');
  assert('host.profile', meStatus === 200 && me?.username, `${me?.username} canHost=${me?.canHostLive}`);
  if (!me?.canHostLive) throw new Error('Host cannot host live');
  const hostUsername = me.username;

  const mod = await mintSessionForProfileUsername(MOD_USERNAME);
  ok('mod.session', `${mod.username} <redacted>`);
  const viewer = await mintSessionForProfileUsername(VIEWER_USERNAME);
  ok('viewer.session', `${viewer.username} <redacted>`);

  // Ensure live notifs on for viewer/mod
  for (const u of [mod, viewer, { token: hostToken, username: hostUsername }]) {
    await api(u.token, '/profiles/me/settings', { method: 'PATCH', body: { notifLive: true } });
  }
  ok('prefs.notif_live_on');

  await endOpenLives(hostToken, hostUsername);

  // --- Listing ---
  const draft = await api(hostToken, '/listings/draft', {
    method: 'POST',
    body: {
      title: 'E2E Live Tee',
      brand: 'Throve',
      price: 8500,
      size: 'M',
      condition: 'Good',
      department: 'Women',
      category: 'Tops',
      description: 'E2E live product for API test',
      photoUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
      shipping: 'Lagos',
    },
  });
  assert('listing.draft', draft.status === 200 || draft.status === 201, draft.json?.id || draft.json?.message);
  const listingId = draft.json?.id;
  if (!listingId) throw new Error('No listing id');

  const pub = await api(hostToken, `/listings/${listingId}/publish`, { method: 'POST', body: {} });
  assert('listing.publish', pub.status === 200 && pub.json?.status === 'available', pub.json?.status || pub.json?.message);

  // --- Follow ---
  const follow = await api(viewer.token, `/profiles/${encodeURIComponent(hostUsername)}/follow`, {
    method: 'POST',
    body: {},
  });
  assert(
    'follow.host',
    follow.status === 200 && follow.json?.isFollowing === true,
    `status=${follow.status} followers=${follow.json?.followerCount} msg=${follow.json?.message || ''}`,
  );

  // --- Moderators ---
  const tMod = Date.now();
  const appoint = await api(hostToken, '/live/moderators', {
    method: 'POST',
    body: { usernames: [mod.username] },
  });
  assert('mod.appoint', appoint.status === 200, JSON.stringify(appoint.json?.usernames || appoint.json));
  await new Promise((r) => setTimeout(r, 1500));
  const modNotifs = await notificationsSince(mod.token, tMod, ['live_moderator_appointed']);
  assert('mod.notif_appointed', modNotifs.items.length >= 1, modNotifs.items[0]?.title || 'none');

  const remove = await api(hostToken, `/live/moderators/${encodeURIComponent(mod.username)}`, { method: 'DELETE' });
  assert('mod.remove', remove.status === 200, remove.json?.ok ? 'ok' : JSON.stringify(remove.json));
  await new Promise((r) => setTimeout(r, 1000));
  const modRemoved = await notificationsSince(mod.token, tMod, ['live_moderator_removed']);
  assert('mod.notif_removed', modRemoved.items.length >= 1, modRemoved.items[0]?.title || 'none');

  const reappoint = await api(hostToken, '/live/moderators', {
    method: 'POST',
    body: { usernames: [mod.username] },
  });
  assert('mod.reappoint', reappoint.status === 200, JSON.stringify(reappoint.json?.usernames || reappoint.json));

  // --- Go live ---
  const tLive = Date.now();
  const live = await api(hostToken, '/live/sessions', {
    method: 'POST',
    body: {
      title: 'E2E Live Full Test',
      department: 'Women',
      category: 'Tops',
      description: 'Automated production E2E',
      products: [{ listingId, livePrice: 7500, stock: 2, isPinned: true }],
      moderatorUsernames: [mod.username],
    },
  });
  assert('live.create', live.status === 201 || live.status === 200, live.json?.id || live.json?.message);
  const sessionId = live.json?.id;
  const productId = live.json?.products?.[0]?.id;
  if (!sessionId) throw new Error('No session id');
  ok('live.product', productId || 'missing product id');

  await new Promise((r) => setTimeout(r, 2000));
  const viewerLiveNotifs = await notificationsSince(viewer.token, tLive, ['followed_seller_live_started']);
  assert('live.follower_notif', viewerLiveNotifs.items.length >= 1, viewerLiveNotifs.items[0]?.title || 'none');

  const hostLiveNotifs = await notificationsSince(hostToken, tLive, ['followed_seller_live_started']);
  assert('live.host_no_self_spam', hostLiveNotifs.items.length === 0, `count=${hostLiveNotifs.items.length}`);

  // Viewer presence: clients POST viewer count (from Realtime presence), then mint LiveKit token.
  const join = await api(viewer.token, `/live/sessions/${sessionId}/viewers`, {
    method: 'POST',
    body: { viewers: 2 },
  });
  assert('live.join', join.status === 200 && join.json?.ok === true, join.json?.message || String(join.status));
  const lk = await api(viewer.token, `/live/sessions/${sessionId}/token`, { method: 'POST', body: {} });
  assert(
    'live.token',
    lk.status === 200 && Boolean(lk.json?.token),
    lk.status === 503 ? 'LiveKit unavailable' : lk.json?.message || String(lk.status),
  );

  // --- Claim ---
  const tClaim = Date.now();
  if (!productId) {
    fail('claim', 'no productId on session');
  } else {
    const claim = await api(viewer.token, `/live/sessions/${sessionId}/products/${productId}/claim`, {
      method: 'POST',
      body: { quantity: 1 },
    });
    assert('claim.create', claim.status === 200, claim.json?.id || claim.json?.message || claim.json?.error);
    await new Promise((r) => setTimeout(r, 1500));
    const claimerNotifs = await notificationsSince(viewer.token, tClaim, ['live_claim_reserved']);
    assert('claim.viewer_notif', claimerNotifs.items.length >= 1, claimerNotifs.items[0]?.title || 'none');
    const hostClaimNotifs = await notificationsSince(hostToken, tClaim, ['live_claim_host']);
    assert('claim.host_notif', hostClaimNotifs.items.length >= 1, hostClaimNotifs.items[0]?.title || 'none');

    // End with open claim
    const tEnd = Date.now();
    const end = await api(hostToken, `/live/sessions/${sessionId}/end`, {
      method: 'POST',
      body: { reason: 'host', peakViewers: 3 },
    });
    assert('live.end', end.status === 200, end.json?.status || end.json?.message);
    await new Promise((r) => setTimeout(r, 1500));
    const endClaimNotifs = await notificationsSince(viewer.token, tEnd, ['live_ended_with_claim']);
    assert('live.end_claim_notif', endClaimNotifs.items.length >= 1, endClaimNotifs.items[0]?.title || 'none');
  }

  // --- Schedule + start ---
  // Need another available listing or reuse — listing may be reserved. Create second listing.
  const draft2 = await api(hostToken, '/listings/draft', {
    method: 'POST',
    body: {
      title: 'E2E Schedule Tee',
      brand: 'Throve',
      price: 9000,
      size: 'L',
      condition: 'Good',
      department: 'Women',
      category: 'Tops',
      description: 'E2E scheduled live product',
      photoUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
      shipping: 'Lagos',
    },
  });
  const listing2 = draft2.json?.id;
  const pub2 = listing2
    ? await api(hostToken, `/listings/${listing2}/publish`, { method: 'POST', body: {} })
    : { status: 0, json: {} };
  assert('listing2.publish', pub2.status === 200 && pub2.json?.status === 'available', pub2.json?.status || pub2.json?.message);

  const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const tSched = Date.now();
  const upcoming = await api(hostToken, '/live/sessions', {
    method: 'POST',
    body: {
      title: 'E2E Upcoming Live',
      department: 'Women',
      products: [{ listingId: listing2, livePrice: 8000, stock: 1, isPinned: true }],
      scheduledAt,
    },
  });
  assert('schedule.create', (upcoming.status === 201 || upcoming.status === 200) && upcoming.json?.status === 'upcoming', upcoming.json?.status || upcoming.json?.message);
  const upcomingId = upcoming.json?.id;
  await new Promise((r) => setTimeout(r, 1500));
  const hostSchedNotif = await notificationsSince(hostToken, tSched, ['live_scheduled']);
  assert('schedule.host_notif', hostSchedNotif.items.length >= 1, hostSchedNotif.items[0]?.title || 'none');
  const viewerSchedNotif = await notificationsSince(viewer.token, tSched, ['followed_seller_live_upcoming']);
  assert('schedule.follower_notif', viewerSchedNotif.items.length >= 1, viewerSchedNotif.items[0]?.title || 'none');

  if (upcomingId) {
    const tStart = Date.now();
    const started = await api(hostToken, `/live/sessions/${upcomingId}/start`, { method: 'POST', body: {} });
    assert('schedule.start', started.status === 200 && started.json?.status === 'live', started.json?.status || started.json?.message);
    await new Promise((r) => setTimeout(r, 1500));
    const startNotifs = await notificationsSince(viewer.token, tStart, ['followed_seller_live_started']);
    assert('schedule.start_follower_notif', startNotifs.items.length >= 1, startNotifs.items[0]?.title || 'none');
    await api(hostToken, `/live/sessions/${upcomingId}/end`, { method: 'POST', body: { reason: 'host' } });
    ok('schedule.cleanup_end');
  }

  // --- Prefs off ---
  await api(viewer.token, '/profiles/me/settings', { method: 'PATCH', body: { notifLive: false } });
  const draft3 = await api(hostToken, '/listings/draft', {
    method: 'POST',
    body: {
      title: 'E2E Prefs Tee',
      brand: 'Throve',
      price: 5000,
      size: 'S',
      condition: 'Good',
      department: 'Women',
      category: 'Tops',
      description: 'prefs off test',
      photoUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
      shipping: 'Lagos',
    },
  });
  const listing3 = draft3.json?.id;
  await api(hostToken, `/listings/${listing3}/publish`, { method: 'POST', body: {} });
  const tPrefs = Date.now();
  const quietLive = await api(hostToken, '/live/sessions', {
    method: 'POST',
    body: {
      title: 'E2E Prefs Off Live',
      department: 'Women',
      products: [{ listingId: listing3, livePrice: 4000, stock: 1, isPinned: true }],
    },
  });
  const quietId = quietLive.json?.id;
  await new Promise((r) => setTimeout(r, 2000));
  const quietNotifs = await notificationsSince(viewer.token, tPrefs, ['followed_seller_live_started']);
  assert('prefs.off_silence', quietNotifs.items.length === 0, `count=${quietNotifs.items.length}`);
  if (quietId) await api(hostToken, `/live/sessions/${quietId}/end`, { method: 'POST', body: { reason: 'host' } });
  await api(viewer.token, '/profiles/me/settings', { method: 'PATCH', body: { notifLive: true } });
  ok('prefs.restored');

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log('\n=== SUMMARY ===');
  console.log(`passed=${passed} failed=${failed} elapsed_ms=${Date.now() - t0}`);
  writeFileSync('/tmp/throve_live_e2e_results.json', JSON.stringify({ passed, failed, results }, null, 2));
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
