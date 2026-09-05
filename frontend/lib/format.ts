export function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function starString(avg: number) {
  const full = Math.round(avg);
  return Array.from({ length: 5 }, (_, index) => (index < full ? '★' : '☆')).join('');
}

export function formatRelativeTime(ts: number) {
  const delta = Math.max(0, Date.now() - ts);
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '1d';
  return `${days}d`;
}

/** Inbox list timestamps: today → HH:mm, yesterday → Yesterday, else short date. */
export function formatInboxTime(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const date = new Date(ts);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86_400_000;
  if (ts >= startToday) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
  if (ts >= startYesterday) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Chat bubble clock: always HH:mm */
export function formatChatClock(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return '';
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function chatDayLabel(ts: number) {
  if (!Number.isFinite(ts) || ts <= 0) return '';
  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const start = startToday.getTime();
  if (ts >= start) return 'Today';
  if (ts >= start - 86_400_000) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
