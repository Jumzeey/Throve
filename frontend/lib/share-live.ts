import { API_URL } from '@/lib/api';
import { NativeModules, Platform, Share } from 'react-native';

export type LiveSharePayload = {
  id: string;
  title: string;
  host: string;
};

/** HTTPS share URL with Open Graph tags (WhatsApp / iMessage rich previews). */
export function liveShareUrl(sessionId: string) {
  return `${API_URL.replace(/\/$/, '')}/share/live/${sessionId}`;
}

export function liveShareContent(session: LiveSharePayload) {
  const url = liveShareUrl(session.id);
  const message = `Watch ${session.host} live on Throve — ${session.title}\n${url}`;
  return { url, message, title: session.title };
}

function isShareCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel/i.test(message);
}

/** Opens the system share sheet for a live session so others can join. */
export async function openLiveShare(session: LiveSharePayload) {
  const { message, title } = liveShareContent(session);

  if (NativeModules.RNShare) {
    try {
      const RNShare = require('react-native-share').default as {
        open: (options: Record<string, unknown>) => Promise<unknown>;
      };
      await RNShare.open({
        title,
        message,
        failOnCancel: false,
      });
      return;
    } catch (error) {
      if (isShareCancel(error)) return;
      // Fall through to RN Share if react-native-share fails for another reason.
    }
  }

  try {
    await Share.share(Platform.OS === 'ios' ? { message, title } : { message, title });
  } catch (error) {
    if (isShareCancel(error)) return;
    throw error;
  }
}
