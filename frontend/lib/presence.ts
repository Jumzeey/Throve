const ONLINE_MS = 2 * 60 * 1000;

export function isOnline(lastSeenAt?: number | null, now = Date.now()) {
  if (!lastSeenAt) return false;
  return now - lastSeenAt < ONLINE_MS;
}

/** WhatsApp-style last seen line. */
export function formatLastSeen(lastSeenAt?: number | null, nowMs = Date.now()) {
  if (!lastSeenAt) return '';
  if (isOnline(lastSeenAt, nowMs)) return 'Online';
  const date = new Date(lastSeenAt);
  const now = new Date(nowMs);
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86_400_000;
  const time = date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).toLowerCase();
  if (lastSeenAt >= startToday) return `Last seen today at ${time}`;
  if (lastSeenAt >= startYesterday) return `Last seen yesterday at ${time}`;
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `Last seen ${day} at ${time}`;
}
