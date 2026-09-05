import { apiUpload } from '@/lib/api';
import { isUploadableLocalFileUri, listingPhotoFormPart } from '@/lib/listing-photos';
import type { UserProfile } from '@/data/types';

export function isPublicPhotoUri(uri?: string | null): uri is string {
  return Boolean(uri && (uri.startsWith('https://') || uri.startsWith('http://')));
}

export function isLocalPhotoUri(uri?: string | null): uri is string {
  return Boolean(uri && !isPublicPhotoUri(uri));
}

/** Profiles only store backend URLs — never device file paths. */
export function publicOnlyProfile(profile: UserProfile): UserProfile {
  if (isPublicPhotoUri(profile.photoUri)) return profile;
  return { ...profile, photoUri: undefined };
}

export async function uploadProfilePhoto(uri: string): Promise<string> {
  if (!isUploadableLocalFileUri(uri)) {
    throw new Error('Photo file is not available on this device.');
  }
  const formData = new FormData();
  formData.append('file', listingPhotoFormPart(uri, 0) as unknown as Blob);
  const uploaded = await apiUpload<{ url: string }>('/media/profile-photo', formData);
  if (!isPublicPhotoUri(uploaded.url)) throw new Error('Photo upload did not return a URL.');
  return uploaded.url;
}
