import { createHash, randomBytes } from 'crypto';
import type { DbRow } from './db-types.js';
import { buildEmail } from './email/layout.js';
import { escapeHtml } from './email/layout.js';
import { sendMailjetEmail } from './mailjet.js';
import type { AdminRole } from './staff-rbac.js';

export const STAFF_EMAIL_DOMAIN = 'throve.store';
export const INVITE_TTL_MS = 7 * 24 * 60 * 60_000;

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  trust_safety: 'Trust & Safety',
  support: 'Customer Support',
  finance: 'Finance',
};

/** ilike pattern that matches exactly this text (case-insensitive), with no wildcards. */
export function escapeLikeExact(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function isStaffEmail(email: string) {
  return email.trim().toLowerCase().endsWith(`@${STAFF_EMAIL_DOMAIN}`);
}

export function newInviteToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashInviteToken(token) };
}

export function hashInviteToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function inviteState(row: DbRow): 'pending' | 'accepted' | 'revoked' | 'expired' {
  if (row.accepted_at) return 'accepted';
  if (row.revoked_at) return 'revoked';
  if (new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
  return 'pending';
}

export function mapInvite(row: DbRow) {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ''),
    role: row.role as AdminRole,
    state: inviteState(row),
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    acceptedAt: row.accepted_at ?? null,
  };
}

/**
 * Admin console base URL for the accept link. ADMIN_APP_URL wins; otherwise the console the
 * super admin is using (request Origin), which keeps preview deploys working.
 */
export function adminAppUrl(origin?: string | null) {
  const configured = process.env.ADMIN_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, '');
  return 'http://localhost:5173';
}

export async function sendStaffInviteEmail(input: {
  email: string;
  name: string;
  role: AdminRole;
  inviterName: string;
  link: string;
}) {
  const role = ROLE_LABELS[input.role];
  const greeting = input.name ? `Hi ${escapeHtml(input.name)}, ` : '';
  const content = buildEmail({
    subject: 'You’re invited to Throve Admin',
    title: 'Join Throve Admin',
    bodyHtml: `${greeting}${escapeHtml(input.inviterName)} invited you to the Throve admin console as <strong>${escapeHtml(role)}</strong>. Confirm this email address and set your password to get access.`,
    bodyText: `${input.name ? `Hi ${input.name}, ` : ''}${input.inviterName} invited you to the Throve admin console as ${role}. Confirm this email address and set your password: ${input.link}`,
    ctaLabel: 'Accept invite',
    actionLink: input.link,
    footnote: 'This link works once and expires in 7 days. If you weren’t expecting it, ignore this email.',
  });
  await sendMailjetEmail({ to: input.email, subject: content.subject, html: content.html, text: content.text });
}
