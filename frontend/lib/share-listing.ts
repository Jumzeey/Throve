import { API_URL } from '@/lib/api';
import { NativeModules, Platform, Share } from 'react-native';

export type ListingSharePayload = {
  id: string;
  title: string;
  price: number;
};

/** HTTPS share URL with Open Graph tags (WhatsApp / iMessage rich previews). */
export function listingShareUrl(listingId: string) {
  return `${API_URL}/share/product/${listingId}`;
}

export function listingShareContent(listing: ListingSharePayload) {
  const url = listingShareUrl(listing.id);
  // Single message body — do not also pass `url` separately or messengers duplicate the link.
  const message = `Check out this product I found on Throve:\n${url}`;
  return { url, message, title: listing.title };
}

function isShareCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel/i.test(message);
}

export async function openNativeShare(listing: ListingSharePayload) {
  const { message, title } = listingShareContent(listing);

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
    }
  }

  await Share.share(
    Platform.OS === 'ios' ? { message, title } : { message, title },
  );
}
