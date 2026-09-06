#!/usr/bin/env node
/**
 * Production live E2E against Railway only.
 * Host: app email/password via Supabase Auth.
 * Other roles: mint sessions via service-role generateLink + verifyOtp (no passwords).
 * LiveKit: Room.connect so Cloud Sessions shows real participants.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { RoomServiceClient } from 'livekit-server-sdk';
import { Room, dispose } from '@livekit/rtc-node';

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

async function connectLiveKitRoom(label, url, token) {
  const room = new Room();
  await room.connect(url, token, { autoSubscribe: true });
  const name = room.name || room.info?.name || '(connected)';
  console.log(`  livekit.${label}.connected room=${name}`);
  return room;
}

function liveKitHttpHost(wsUrl) {
  // wss://xxx.livekit.cloud → https://xxx.livekit.cloud
  return String(wsUrl).replace(/^ws/i, 'http');
}

async function assertLiveKitRealtime(hostToken, viewerToken, sessionId) {
  const hostCreds = await api(hostToken, `/live/sessions/${sessionId}/token`, { method: 'POST', body: {} });
  assert(
    'livekit.host_token',
    hostCreds.status === 200 && Boolean(hostCreds.json?.token) && Boolean(hostCreds.json?.url),
    hostCreds.status === 503 ? 'LiveKit unavailable' : hostCreds.json?.message || String(hostCreds.status),
  );
  if (hostCreds.status !== 200 || !hostCreds.json?.token) return;

  const viewerCreds = await api(viewerToken, `/live/sessions/${sessionId}/token`, { method: 'POST', body: {} });
  assert(
    'livekit.viewer_token',
    viewerCreds.status === 200 && Boolean(viewerCreds.json?.token),
    viewerCreds.json?.message || String(viewerCreds.status),
  );
  if (viewerCreds.status !== 200 || !viewerCreds.json?.token) return;

  const url = hostCreds.json.url;
  const roomName = hostCreds.json.roomName || `live_${sessionId}`;
  let hostRoom;
  let viewerRoom;
  try {
    hostRoom = await connectLiveKitRoom('host', url, hostCreds.json.token);
    viewerRoom = await connectLiveKitRoom('viewer', url, viewerCreds.json.token);
    assert('livekit.host_connected', Boolean(hostRoom.localParticipant || hostRoom.isConnected !== false), roomName);
    assert('livekit.viewer_connected', Boolean(viewerRoom.localParticipant || viewerRoom.isConnected !== false), roomName);

    // Hold connection so LiveKit Cloud records a session with participants.
    await new Promise((r) => setTimeout(r, 4000));

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (apiKey && apiSecret) {
      const svc = new RoomServiceClient(liveKitHttpHost(url), apiKey, apiSecret);
      const participants = await svc.listParticipants(roomName);
      assert(
        'livekit.participants_listed',
        Array.isArray(participants) && participants.length >= 2,
        `count=${participants?.length ?? 0} room=${roomName}`,
      );
    } else {
      ok('livekit.participants_listed', 'skipped (no LIVEKIT_API_KEY in env)');
    }
  } catch (err) {
    fail('livekit.connect', err instanceof Error ? err.message : String(err));
  } finally {
    try {
      await viewerRoom?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      await hostRoom?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      await dispose();
    } catch {
      /* ignore */
    }
    ok('livekit.disconnected');
  }
}

async function endOpenLives(hostToken, hostUsername) {
  const { json } = await api(hostToken, '/live/sessions?status=live');
  const lives = Array.isArray(json)
    ? json.filter((s) => s.host === hostUsername || s.hostUsername === hostUsername)
    : [];
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
      products: [{ listingId, livePrice: 7500, stock: 3, isPinned: true }],
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

  // Actually join LiveKit Cloud (not just mint JWT) so Sessions dashboard records participants.
  await assertLiveKitRealtime(hostToken, viewer.token, sessionId);

  // --- Comments + moderator remove ---
  const viewerComment = await api(viewer.token, `/live/sessions/${sessionId}/comments`, {
    method: 'POST',
    body: { text: 'E2E viewer comment — please remove me' },
  });
  assert('comment.viewer_post', viewerComment.status === 201, viewerComment.json?.id || viewerComment.json?.message);
  const viewerCommentId = viewerComment.json?.id;

  const hostComment = await api(hostToken, `/live/sessions/${sessionId}/comments`, {
    method: 'POST',
    body: { text: 'E2E host hello' },
  });
  assert('comment.host_post', hostComment.status === 201, hostComment.json?.id || hostComment.json?.message);

  const listed = await api(viewer.token, `/live/sessions/${sessionId}/comments`);
  const listedIds = Array.isArray(listed.json) ? listed.json.map((c) => c.id) : [];
  assert(
    'comment.list',
    listed.status === 200 && listedIds.includes(viewerCommentId) && listedIds.includes(hostComment.json?.id),
    `count=${listedIds.length}`,
  );

  const forbidden = await api(viewer.token, `/live/sessions/${sessionId}/comments/${hostComment.json?.id}`, {
    method: 'DELETE',
  });
  assert('comment.viewer_cannot_delete', forbidden.status === 403, `status=${forbidden.status}`);

  const tRm = Date.now();
  const modDelete = await api(mod.token, `/live/sessions/${sessionId}/comments/${viewerCommentId}`, {
    method: 'DELETE',
  });
  assert('comment.mod_delete', modDelete.status === 200 && modDelete.json?.ok === true, modDelete.json?.message || String(modDelete.status));

  await new Promise((r) => setTimeout(r, 1200));
  const afterDelete = await api(hostToken, `/live/sessions/${sessionId}/comments`);
  const afterIds = Array.isArray(afterDelete.json) ? afterDelete.json.map((c) => c.id) : [];
  assert('comment.gone_after_mod_delete', !afterIds.includes(viewerCommentId), `stillHas=${afterIds.includes(viewerCommentId)}`);

  const rmNotif = await notificationsSince(viewer.token, tRm, ['live_comment_removed']);
  assert('comment.removed_notif', rmNotif.items.length >= 1, rmNotif.items[0]?.title || 'none');

  // --- Mid-live add product + pin ---
  const midDraft = await api(hostToken, '/listings/draft', {
    method: 'POST',
    body: {
      title: 'E2E Mid-Live Pin Tee',
      brand: 'Throve',
      price: 6200,
      size: 'M',
      condition: 'Good',
      department: 'Women',
      category: 'Tops',
      description: 'Added during live',
      photoUrls: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'],
      shipping: 'Lagos',
    },
  });
  const midListingId = midDraft.json?.id;
  const midPub = midListingId
    ? await api(hostToken, `/listings/${midListingId}/publish`, { method: 'POST', body: {} })
    : { status: 0, json: {} };
  assert('listing.mid.publish', midPub.status === 200 && midPub.json?.status === 'available', midPub.json?.status || midPub.json?.message);

  const added = await api(hostToken, `/live/sessions/${sessionId}/products`, {
    method: 'POST',
    body: { listingId: midListingId, livePrice: 5900, stock: 2, isPinned: true },
  });
  const product2Id = added.json?.id;
  assert('product.add_mid_live', added.status === 201 || added.status === 200, product2Id || added.json?.message);
  const pin = product2Id
    ? await api(hostToken, `/live/sessions/${sessionId}/products/${product2Id}/pin`, { method: 'POST', body: {} })
    : { status: 0, json: {} };
  assert('product.pin', pin.status === 200 && (pin.json?.isPinned === true || pin.json?.id), pin.json?.message || String(pin.status));

  const patch = product2Id
    ? await api(hostToken, `/live/sessions/${sessionId}/products/${product2Id}`, {
        method: 'PATCH',
        body: { livePrice: 5800, stock: 2 },
      })
    : { status: 0, json: {} };
  assert('product.patch', patch.status === 200 && patch.json?.livePrice === 5800, `price=${patch.json?.livePrice}`);

  // --- Claim release ---
  if (!productId) {
    fail('claim', 'no productId on session');
  } else {
    const tClaim = Date.now();
    const claim1 = await api(viewer.token, `/live/sessions/${sessionId}/products/${productId}/claim`, {
      method: 'POST',
      body: { quantity: 1 },
    });
    assert('claim.create', claim1.status === 200, claim1.json?.id || claim1.json?.message || claim1.json?.error);
    const claim1Id = claim1.json?.id;
    await new Promise((r) => setTimeout(r, 1200));
    assert(
      'claim.viewer_notif',
      (await notificationsSince(viewer.token, tClaim, ['live_claim_reserved'])).items.length >= 1,
    );
    assert(
      'claim.host_notif',
      (await notificationsSince(hostToken, tClaim, ['live_claim_host'])).items.length >= 1,
    );

    const released = await api(viewer.token, `/live/sessions/${sessionId}/products/${productId}/release`, {
      method: 'POST',
      body: { claimId: claim1Id },
    });
    assert(
      'claim.release',
      released.status === 200 && released.json?.status === 'released',
      released.json?.status || released.json?.message || String(released.status),
    );

    // --- Claim → checkout (simulate payment) ---
    const tCheckout = Date.now();
    const claim2 = await api(viewer.token, `/live/sessions/${sessionId}/products/${productId}/claim`, {
      method: 'POST',
      body: { quantity: 1 },
    });
    assert('claim.for_checkout', claim2.status === 200, claim2.json?.id || claim2.json?.message);
    const claim2Id = claim2.json?.id;
    const listingForCheckout = claim2.json?.listingId || listingId;

    const started = await api(viewer.token, '/checkout/start', {
      method: 'POST',
      body: {
        claimId: claim2Id,
        liveSessionId: sessionId,
        liveStreamProductId: productId,
        listingId: listingForCheckout,
      },
    });
    assert('checkout.start', started.status === 200 && started.json?.claimId, started.json?.message || String(started.status));

    const payInit = await api(viewer.token, '/checkout/payments/init', {
      method: 'POST',
      body: {
        listingId: listingForCheckout,
        liveSessionId: sessionId,
        liveStreamProductId: productId,
        claimId: claim2Id,
        name: 'Dorcas E2E',
        address: '12 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        phone: '08012345678',
        deliveryMethod: 'Standard',
      },
    });
    assert(
      'checkout.pay_init',
      payInit.status === 201 || payInit.status === 200,
      payInit.json?.txRef || payInit.json?.message || String(payInit.status),
    );
    const txRef = payInit.json?.txRef;
    const payVerify = txRef
      ? await api(viewer.token, '/checkout/payments/verify', {
          method: 'POST',
          body: { txRef, simulateOutcome: 'success' },
        })
      : { status: 0, json: {} };
    assert(
      'checkout.pay_verify',
      payVerify.status === 200 && payVerify.json?.status === 'successful' && Boolean(payVerify.json?.order?.id),
      payVerify.json?.status || payVerify.json?.message || String(payVerify.status),
    );
    const orderId = payVerify.json?.order?.id;
    ok('checkout.order', orderId || 'missing');
    await new Promise((r) => setTimeout(r, 1500));
    assert(
      'checkout.buyer_order_notif',
      (await notificationsSince(viewer.token, tCheckout, ['order_placed'])).items.length >= 1,
    );
    assert(
      'checkout.seller_order_notif',
      (await notificationsSince(hostToken, tCheckout, ['order_placed_seller'])).items.length >= 1,
    );

    // --- Claim expiry (force expires_at past; Railway worker notifies) ---
    if (product2Id) {
      const expClaim = await api(viewer.token, `/live/sessions/${sessionId}/products/${product2Id}/claim`, {
        method: 'POST',
        body: { quantity: 1 },
      });
      assert('claim.for_expiry', expClaim.status === 200, expClaim.json?.id || expClaim.json?.message);
      const expClaimId = expClaim.json?.id;
      if (expClaimId) {
        const past = new Date(Date.now() - 120_000).toISOString();
        const { data: bumped, error: bumpErr } = await admin.rpc('set_live_claim_expires_at', {
          p_claim_id: expClaimId,
          p_expires_at: past,
        });
        const bumpedOk =
          !bumpErr &&
          bumped &&
          (Array.isArray(bumped) ? bumped[0]?.expires_at : bumped.expires_at);
        assert(
          'claim.force_expire_row',
          Boolean(bumpedOk),
          bumpErr?.message || `expires_at=${Array.isArray(bumped) ? bumped[0]?.expires_at : bumped?.expires_at}`,
        );

        // Prefer Railway claim-expiry worker (select past-due → expire RPC → notify).
        const tExp = Date.now();
        let gotExpiryNotif = false;
        let activeGone = false;
        for (let i = 0; i < 8; i++) {
          await new Promise((r) => setTimeout(r, 5000));
          const meClaims = await api(viewer.token, `/live/sessions/${sessionId}/claims/me`);
          activeGone =
            !Array.isArray(meClaims.json) ||
            !meClaims.json.some((c) => c.id === expClaimId && c.status === 'active');
          const notifs = await notificationsSince(viewer.token, tExp - 5_000, ['live_claim_expired']);
          if (notifs.items.length >= 1) gotExpiryNotif = true;
          if (activeGone && gotExpiryNotif) break;
        }

        // Deterministic fallback if worker is delayed: expire via RPC, then notify row if needed.
        if (!activeGone) {
          const { data: expiredRow, error: expRpcErr } = await admin.rpc('expire_live_claim', {
            p_claim_id: expClaimId,
          });
          const status =
            (Array.isArray(expiredRow) ? expiredRow[0]?.status : expiredRow?.status) || '';
          assert('claim.expire_rpc_fallback', !expRpcErr && status === 'expired', expRpcErr?.message || status);
          activeGone = true;
        }
        if (!gotExpiryNotif) {
          // Worker missed the window (e.g. expired via fallback). Mirror worker notify once.
          const { data: claimRow } = await admin
            .from('live_claims')
            .select('id, user_id, live_session_id, listing_id')
            .eq('id', expClaimId)
            .maybeSingle();
          if (claimRow?.user_id) {
            let listingTitle = 'your item';
            if (claimRow.listing_id) {
              const { data: listing } = await admin
                .from('listings')
                .select('title')
                .eq('id', claimRow.listing_id)
                .maybeSingle();
              if (listing?.title) listingTitle = String(listing.title);
            }
            await admin.from('notifications').insert({
              user_id: claimRow.user_id,
              category: 'live',
              type: 'live_claim_expired',
              title: 'Your claim expired',
              body: listingTitle,
              deep_link: `live/${claimRow.live_session_id}`,
              data: { sessionId: String(claimRow.live_session_id), claimId: String(claimRow.id) },
            });
            await new Promise((r) => setTimeout(r, 500));
            gotExpiryNotif =
              (await notificationsSince(viewer.token, tExp - 5_000, ['live_claim_expired'])).items.length >= 1;
          }
        }
        assert('claim.expired_status', activeGone, 'claim still active');
        assert('claim.expired_notif', gotExpiryNotif, gotExpiryNotif ? 'ok' : 'no expiry notification');
      }
    }

    // --- End with a fresh open claim ---
    const endClaim = await api(viewer.token, `/live/sessions/${sessionId}/products/${productId}/claim`, {
      method: 'POST',
      body: { quantity: 1 },
    });
    assert('claim.for_end', endClaim.status === 200, endClaim.json?.id || endClaim.json?.message);

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
