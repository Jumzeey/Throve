import { formatNaira } from '@/lib/format';
import * as Linking from 'expo-linking';
import { NativeModules, Platform, Share } from 'react-native';

export type ListingSharePayload = {
  id: string;
  title: string;
  price: number;
};

export function listingShareContent(listing: ListingSharePayload) {
  const url = Linking.createURL(`/product/${listing.id}`);
  const headline = `${listing.title} · ${formatNaira(listing.price)} on Throve`;
  const message = `${headline}\n${url}`;
  return { url, headline, message };
}

function isShareCancel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /cancel/i.test(message);
}

export async function openNativeShare(listing: ListingSharePayload) {
  const { url, headline, message } = listingShareContent(listing);

  if (NativeModules.RNShare) {
    try {
      const RNShare = require('react-native-share').default as {
        open: (options: Record<string, unknown>) => Promise<unknown>;
      };
      await RNShare.open({
        title: headline,
        message: Platform.OS === 'ios' ? headline : message,
        url,
        failOnCancel: false,
      });
      return;
    } catch (error) {
      if (isShareCancel(error)) return;
    }
  }

  await Share.share(
    Platform.OS === 'ios'
      ? { message, url, title: headline }
      : { message, title: headline },
  );
}
