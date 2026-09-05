import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/** Shortest side must be at least this many pixels (listing quality bar). */
export const MIN_LISTING_PHOTO_SIDE = 600;
/** Reject uploads larger than backend /media limit. */
export const MAX_LISTING_PHOTO_BYTES = 8 * 1024 * 1024;
export const MAX_LISTING_PHOTOS = 8;

export type ListingPhotoPickResult = {
  uris: string[];
  rejected: string[];
};

function isRemoteUri(uri: string) {
  return uri.startsWith('http://') || uri.startsWith('https://');
}

export function isLocalListingPhotoUri(uri: string) {
  return !isRemoteUri(uri);
}

/**
 * Native FormData crashes the app if the URI is missing or from another OS
 * (e.g. an Android /data/user path loaded on iOS). Only attach files that
 * this device can actually open.
 */
export function isUploadableLocalFileUri(uri?: string | null): uri is string {
  if (!uri || isRemoteUri(uri)) return false;

  const path = uri.replace(/^file:\/\//, '');

  if (Platform.OS === 'ios' || Platform.OS === 'macos') {
    if (uri.startsWith('content://')) return false;
    if (path.startsWith('/data/user/') || path.startsWith('/data/data/') || path.startsWith('/storage/')) {
      return false;
    }
    return uri.startsWith('file://') || uri.startsWith('ph://') || uri.startsWith('assets-library://') || path.startsWith('/');
  }

  if (Platform.OS === 'android') {
    if (uri.startsWith('ph://') || uri.startsWith('assets-library://')) return false;
    if (path.startsWith('/var/') || path.startsWith('/private/var/') || path.includes('/CoreSimulator/')) {
      return false;
    }
    if (/\/Containers\/Data\/Application\//.test(path)) return false;
    return uri.startsWith('file://') || uri.startsWith('content://') || path.startsWith('/data/') || path.startsWith('/storage/');
  }

  return false;
}

/**
 * iOS still needs library permission. On Android 13+ the system photo picker
 * works without READ_MEDIA_* — we never declare those (Play policy).
 */
export async function ensureMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) return true;
    await ImagePicker.requestMediaLibraryPermissionsAsync();
    // Even if legacy storage permission is denied, launchImageLibraryAsync can
    // still use the OS photo picker on modern Android.
    return true;
  }

  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (requested.granted) return true;

  Alert.alert(
    'Photos access needed',
    'Allow photo library access in Settings so you can add listing photos.',
  );
  return false;
}

function validateAsset(asset: ImagePicker.ImagePickerAsset): string | null {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const shortSide = Math.min(width, height);

  if (width > 0 && height > 0 && shortSide < MIN_LISTING_PHOTO_SIDE) {
    return `Photos must be at least ${MIN_LISTING_PHOTO_SIDE}px on the short side (this one is ${width}×${height}).`;
  }

  const size = asset.fileSize ?? 0;
  if (size > MAX_LISTING_PHOTO_BYTES) {
    const mb = (size / (1024 * 1024)).toFixed(1);
    return `Each photo must be under 8MB (this one is ${mb}MB). Choose a smaller file or compress it.`;
  }

  const mime = (asset.mimeType ?? '').toLowerCase();
  if (mime && !mime.startsWith('image/')) {
    return 'Only image files are accepted.';
  }

  return null;
}

/** Opens the system library and returns validated local URIs. */
export async function pickListingPhotos(remainingSlots: number): Promise<ListingPhotoPickResult> {
  if (remainingSlots <= 0) {
    return { uris: [], rejected: ['You can add up to 8 photos per listing.'] };
  }

  const allowed = await ensureMediaLibraryPermission();
  if (!allowed) return { uris: [], rejected: [] };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remainingSlots,
    quality: 0.8,
    exif: false,
  });

  if (result.canceled) return { uris: [], rejected: [] };

  const uris: string[] = [];
  const rejected: string[] = [];

  for (const asset of result.assets) {
    const reason = validateAsset(asset);
    if (reason) {
      rejected.push(reason);
      continue;
    }
    if (asset.uri) uris.push(asset.uri);
  }

  return { uris, rejected };
}

export function listingPhotoFormPart(uri: string, index: number) {
  const clean = uri.split('?')[0] ?? uri;
  const extMatch = /\.([a-zA-Z0-9]+)$/.exec(clean);
  const ext = (extMatch?.[1] ?? 'jpg').toLowerCase();
  const mime =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'heic' || ext === 'heif' ? 'image/heic' : 'image/jpeg';

  return {
    uri,
    name: `listing-${index}.${ext === 'heic' || ext === 'heif' ? 'jpg' : ext}`,
    type: mime === 'image/heic' ? 'image/jpeg' : mime,
  };
}
