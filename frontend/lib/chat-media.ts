import { listingPhotoFormPart, ensureMediaLibraryPermission } from '@/lib/listing-photos';
import { apiUpload } from '@/lib/api';
import * as ImagePicker from 'expo-image-picker';

const MAX_CHAT_IMAGE_BYTES = 8 * 1024 * 1024;

export async function pickChatImage(): Promise<{ uri: string } | { error: string } | null> {
  const allowed = await ensureMediaLibraryPermission();
  if (!allowed) return { error: 'Photo library access is needed to send images.' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 0.8,
    exif: false,
  });

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) return { error: 'Could not read that photo.' };

  if (asset.fileSize && asset.fileSize > MAX_CHAT_IMAGE_BYTES) {
    return { error: 'Images must be under 8MB.' };
  }

  return { uri: asset.uri };
}

export async function uploadChatImage(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', listingPhotoFormPart(uri, 0) as unknown as Blob);
  const uploaded = await apiUpload<{ url: string }>('/media/chat-image', formData);
  return uploaded.url;
}
