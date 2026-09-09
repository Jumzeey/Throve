export const MESSAGE_TONES = [
  { id: 'default', label: 'Default', hint: 'System sound' },
  { id: 'note', label: 'Note', hint: 'Short ping' },
  { id: 'chime', label: 'Chime', hint: 'Two-tone, Slack-style' },
  { id: 'soft', label: 'Soft', hint: 'Quieter tap' },
  { id: 'none', label: 'None', hint: 'Silent' },
] as const;

export type MessageToneId = (typeof MESSAGE_TONES)[number]['id'];

export function parseMessageTone(value: unknown): MessageToneId {
  const raw = String(value ?? 'default');
  return MESSAGE_TONES.some((tone) => tone.id === raw) ? (raw as MessageToneId) : 'default';
}

/** Android channel id — sound is baked into the channel, so each tone is its own. */
export function messageChannelId(tone: MessageToneId) {
  return `messages-${tone}`;
}

export function messagePushSound(tone: MessageToneId): string | null {
  if (tone === 'none') return null;
  if (tone === 'default') return 'default';
  return tone;
}

export const MESSAGE_TONE_ASSETS: Record<Exclude<MessageToneId, 'default' | 'none'>, number> = {
  note: require('@/assets/sounds/note.wav'),
  chime: require('@/assets/sounds/chime.wav'),
  soft: require('@/assets/sounds/soft.wav'),
};
