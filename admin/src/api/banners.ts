import { apiFetch } from '@/lib/api';

export type BannerTargetType = 'category_browse' | 'department' | 'listing' | 'live' | 'seller' | 'search' | 'url';
export type BannerTheme = 'plum' | 'espresso' | 'gold' | 'sand';

export type HomeBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  targetType: BannerTargetType;
  targetValue: string | null;
  imageUrl: string | null;
  theme: BannerTheme;
  sortOrder: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
  status: 'Live' | 'Scheduled' | 'Ended' | 'Off';
};

export type HomeBannerInput = Pick<
  HomeBanner,
  'title' | 'subtitle' | 'ctaLabel' | 'targetType' | 'targetValue' | 'imageUrl' | 'theme' | 'active' | 'startsAt' | 'endsAt'
>;

export function fetchBanners() {
  return apiFetch<{ banners: HomeBanner[] }>('/admin/banners');
}

export function createBanner(input: HomeBannerInput) {
  return apiFetch<{ banner: HomeBanner }>('/admin/banners', { method: 'POST', body: JSON.stringify(input) });
}

export function updateBanner(id: string, input: HomeBannerInput) {
  return apiFetch<{ banner: HomeBanner }>(`/admin/banners/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteBanner(id: string) {
  return apiFetch<{ ok: true }>(`/admin/banners/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function reorderBanners(ids: string[]) {
  return apiFetch<{ banners: HomeBanner[] }>('/admin/banners/reorder', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

export function uploadBannerImage(file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiFetch<{ url: string }>('/admin/banners/image', { method: 'POST', body: form });
}
