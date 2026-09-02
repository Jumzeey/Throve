import { messageNewEmail } from './templates/messages.js';
import { queueEmail } from './send.js';

const DEBOUNCE_MS = 12 * 60 * 1000;
const lastSentAt = new Map<string, number>();

/**
 * Email the other participant about a new message, debounced per conversation
 * so rapid back-and-forth does not flood inboxes.
 */
export function queueMessageEmail(input: {
  conversationId: string;
  toUserId: string;
  fromUsername: string;
  preview: string;
}) {
  const key = `${input.conversationId}:${input.toUserId}`;
  const now = Date.now();
  const last = lastSentAt.get(key) ?? 0;
  if (now - last < DEBOUNCE_MS) return;
  lastSentAt.set(key, now);

  queueEmail({
    toUserId: input.toUserId,
    preference: 'messages',
    content: messageNewEmail({
      conversationId: input.conversationId,
      fromUsername: input.fromUsername,
      preview: input.preview,
    }),
  });
}
