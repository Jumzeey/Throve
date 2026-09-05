import { apiFetch } from '@/lib/api';

export type ProfileSearchHit = {
  username: string;
  name?: string;
  photoUri?: string;
};

export async function searchProfiles(query: string): Promise<ProfileSearchHit[]> {
  const q = query.trim().replace(/^@/, '');
  if (!q) return [];
  const rows = await apiFetch<ProfileSearchHit[]>(`/profiles/search?q=${encodeURIComponent(q)}`);
  return Array.isArray(rows) ? rows : [];
}
