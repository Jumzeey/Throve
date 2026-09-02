import { sendMailjetEmail } from '../mailjet.js';
import type { EmailContent } from './layout.js';
import { preferenceAllows, resolveRecipient, type NotificationPreference } from './recipients.js';

export type SendTransactionalInput = {
  toUserId: string;
  /** When set, skip send if the user disabled that preference. Order/security omit this. */
  preference?: NotificationPreference;
  content: EmailContent;
};

/**
 * Resolve recipient, honor prefs, send via Mailjet.
 * Never throws — logs failures so business routes stay non-blocking.
 */
export async function sendTransactionalEmail(input: SendTransactionalInput): Promise<boolean> {
  try {
    const recipient = await resolveRecipient(input.toUserId);
    if (!recipient) {
      console.warn(`[email] no recipient for ${input.toUserId}`);
      return false;
    }
    if (!preferenceAllows(recipient, input.preference)) {
      return false;
    }

    await sendMailjetEmail({
      to: recipient.email,
      subject: input.content.subject,
      html: input.content.html,
      text: input.content.text,
    });
    return true;
  } catch (err) {
    console.warn('[email]', err instanceof Error ? err.message : err);
    return false;
  }
}

/** Fire-and-forget wrapper for route handlers. */
export function queueEmail(input: SendTransactionalInput) {
  void sendTransactionalEmail(input);
}
