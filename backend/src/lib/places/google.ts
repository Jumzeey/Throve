const PLACES_BASE = 'https://places.googleapis.com/v1';

function apiKey() {
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not configured');
  return key;
}

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

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

function componentOf(components: AddressComponent[], type: string, short = false) {
  const match = components.find((item) => item.types?.includes(type));
  if (!match) return '';
  return (short ? match.shortText : match.longText) ?? match.longText ?? match.shortText ?? '';
}

function buildAddressLine(components: AddressComponent[], formatted: string) {
  const streetNumber = componentOf(components, 'street_number');
  const route = componentOf(components, 'route');
  const premise = componentOf(components, 'premise');
  const line = [streetNumber, route].filter(Boolean).join(' ') || premise;
  if (line) return line;
  // Fall back to the first comma-separated segment of the formatted address.
  return formatted.split(',')[0]?.trim() || formatted;
}

export async function placesAutocomplete(input: string, options?: { sessionToken?: string; regionCode?: string }) {
  const key = apiKey();
  const body: Record<string, unknown> = {
    input: input.trim(),
    languageCode: 'en',
  };
  if (options?.sessionToken) body.sessionToken = options.sessionToken;
  if (options?.regionCode) body.includedRegionCodes = [options.regionCode];

  const response = await fetch(`${PLACES_BASE}/places:autocomplete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Places autocomplete failed');
  }

  return (payload.suggestions ?? [])
    .map((item) => {
      const prediction = item.placePrediction;
      if (!prediction?.placeId) return null;
      const primaryText = prediction.structuredFormat?.mainText?.text ?? prediction.text?.text ?? '';
      const secondaryText = prediction.structuredFormat?.secondaryText?.text ?? '';
      return {
        placeId: prediction.placeId,
        primaryText,
        secondaryText,
        fullText: prediction.text?.text ?? [primaryText, secondaryText].filter(Boolean).join(', '),
      } satisfies PlaceSuggestion;
    })
    .filter((item): item is PlaceSuggestion => Boolean(item));
}

export async function placeDetails(placeId: string, sessionToken?: string) {
  const key = apiKey();
  const params = new URLSearchParams();
  if (sessionToken) params.set('sessionToken', sessionToken);
  const qs = params.toString();
  const url = `${PLACES_BASE}/places/${encodeURIComponent(placeId)}${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask':
        'id,formattedAddress,addressComponents,location,displayName,shortFormattedAddress',
    },
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    id?: string;
    formattedAddress?: string;
    shortFormattedAddress?: string;
    displayName?: { text?: string };
    location?: { latitude?: number; longitude?: number };
    addressComponents?: AddressComponent[];
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? 'Place details failed');
  }

  const components = payload.addressComponents ?? [];
  const formatted = payload.formattedAddress ?? payload.shortFormattedAddress ?? payload.displayName?.text ?? '';
  const city =
    componentOf(components, 'locality') ||
    componentOf(components, 'postal_town') ||
    componentOf(components, 'sublocality') ||
    componentOf(components, 'administrative_area_level_2');
  const state = componentOf(components, 'administrative_area_level_1');
  const country = componentOf(components, 'country');
  const labelParts = [city || state, country].filter(Boolean);

  return {
    placeId: payload.id ?? placeId,
    label: labelParts.join(', ') || formatted,
    formattedAddress: formatted,
    addressLine: buildAddressLine(components, formatted),
    city,
    state,
    country,
    postalCode: componentOf(components, 'postal_code') || null,
    lat: payload.location?.latitude ?? null,
    lng: payload.location?.longitude ?? null,
  } satisfies ResolvedPlace;
}

export async function reverseGeocode(lat: number, lng: number) {
  const key = apiKey();
  const response = await fetch(`${PLACES_BASE}/places:searchNearby`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.formattedAddress,places.addressComponents,places.location,places.displayName',
    },
    body: JSON.stringify({
      maxResultCount: 1,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 80,
        },
      },
    }),
  });

  // Prefer Geocoding API for reverse — more reliable for coordinates.
  if (!response.ok) {
    return reverseGeocodeLegacy(lat, lng);
  }

  const payload = (await response.json()) as {
    places?: Array<{
      id?: string;
      formattedAddress?: string;
      displayName?: { text?: string };
      location?: { latitude?: number; longitude?: number };
      addressComponents?: AddressComponent[];
    }>;
  };

  const place = payload.places?.[0];
  if (!place?.id) return reverseGeocodeLegacy(lat, lng);
  return placeDetails(place.id);
}

async function reverseGeocodeLegacy(lat: number, lng: number) {
  const key = apiKey();
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(`${lat},${lng}`)}&key=${encodeURIComponent(key)}`,
  );
  const payload = (await response.json()) as {
    status?: string;
    results?: Array<{
      place_id?: string;
      formatted_address?: string;
      address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  };

  if (payload.status !== 'OK' || !payload.results?.[0]) {
    throw new Error('Could not resolve current location');
  }

  const result = payload.results[0];
  const components: AddressComponent[] = (result.address_components ?? []).map((item) => ({
    longText: item.long_name,
    shortText: item.short_name,
    types: item.types,
  }));
  const formatted = result.formatted_address ?? '';
  const city =
    componentOf(components, 'locality') ||
    componentOf(components, 'postal_town') ||
    componentOf(components, 'sublocality') ||
    componentOf(components, 'administrative_area_level_2');
  const state = componentOf(components, 'administrative_area_level_1');
  const country = componentOf(components, 'country');

  return {
    placeId: result.place_id ?? `geo:${lat},${lng}`,
    label: [city || state, country].filter(Boolean).join(', ') || formatted,
    formattedAddress: formatted,
    addressLine: buildAddressLine(components, formatted),
    city,
    state,
    country,
    postalCode: componentOf(components, 'postal_code') || null,
    lat: result.geometry?.location?.lat ?? lat,
    lng: result.geometry?.location?.lng ?? lng,
  } satisfies ResolvedPlace;
}

export function staticMapUrl(lat: number, lng: number, size = '600x280') {
  const key = apiKey();
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '15',
    size,
    scale: '2',
    maptype: 'roadmap',
    markers: `color:0x5A1F45|${lat},${lng}`,
    key,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function placesConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY);
}
