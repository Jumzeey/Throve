import { API_URL, apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  fullText: string;
};

export type ResolvedPlace = {
  placeId: string;
  label: string;
  formattedAddress: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
};

export async function placesEnabled() {
  try {
    const data = await apiFetch<{ enabled: boolean }>('/places/config');
    return Boolean(data.enabled);
  } catch {
    return false;
  }
}

export async function createPlacesSession() {
  const data = await apiFetch<{ sessionToken: string }>('/places/session', { method: 'POST' });
  return data.sessionToken;
}

export async function searchPlaces(query: string, sessionToken?: string, regionCode = 'NG') {
  const params = new URLSearchParams({
    q: query.trim(),
    regionCode,
  });
  if (sessionToken) params.set('sessionToken', sessionToken);
  const data = await apiFetch<{ suggestions: PlaceSuggestion[] }>(`/places/autocomplete?${params.toString()}`);
  return data.suggestions;
}

export async function fetchPlaceDetails(placeId: string, sessionToken?: string) {
  const params = new URLSearchParams();
  if (sessionToken) params.set('sessionToken', sessionToken);
  const qs = params.toString();
  const data = await apiFetch<{ place: ResolvedPlace }>(
    `/places/details/${encodeURIComponent(placeId)}${qs ? `?${qs}` : ''}`,
  );
  return data.place;
}

export async function reverseGeocodeCoords(lat: number, lng: number) {
  const data = await apiFetch<{ place: ResolvedPlace }>('/places/reverse', {
    method: 'POST',
    body: JSON.stringify({ lat, lng }),
  });
  return data.place;
}

export async function fetchStaticMapDataUri(lat: number, lng: number) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;

  const response = await fetch(`${API_URL}/places/static-map?lat=${lat}&lng=${lng}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;

  const blob = await response.blob();
  return await new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export function googleMapsAppUrl(place: Pick<ResolvedPlace, 'lat' | 'lng' | 'formattedAddress'>) {
  if (place.lat != null && place.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.formattedAddress)}`;
}
