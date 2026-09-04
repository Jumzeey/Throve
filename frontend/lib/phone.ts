import { COUNTRY_DIAL_CODES, DEFAULT_COUNTRY_ISO, getCountryByIso } from '@/data/country-codes';

export type PhoneParts = {
  countryIso: string;
  nationalNumber: string;
};

/** Digits only (no leading zeros stripped yet). */
export function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

export function formatPhoneE164(countryIso: string, nationalNumber: string): string {
  const country = getCountryByIso(countryIso);
  let national = digitsOnly(nationalNumber);
  // Drop a leading 0 common in local NG/GH/KE formatting.
  if (national.startsWith('0')) national = national.slice(1);
  if (!national) return '';
  return `+${country.dial}${national}`;
}

export function parseStoredPhone(value?: string | null): PhoneParts {
  const raw = (value ?? '').trim();
  if (!raw) {
    return { countryIso: DEFAULT_COUNTRY_ISO, nationalNumber: '' };
  }

  const digits = digitsOnly(raw.startsWith('+') ? raw.slice(1) : raw);
  // Longest dial-code match first so +1 US/CA and +234 NG resolve correctly.
  const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const country of sorted) {
    if (digits.startsWith(country.dial)) {
      return {
        countryIso: country.iso,
        nationalNumber: digits.slice(country.dial.length),
      };
    }
  }

  return { countryIso: DEFAULT_COUNTRY_ISO, nationalNumber: digits };
}

export function isValidPhone(countryIso: string, nationalNumber: string): boolean {
  const national = digitsOnly(nationalNumber).replace(/^0+/, '');
  if (national.length < 7 || national.length > 12) return false;
  // Must produce a full E.164 string.
  return formatPhoneE164(countryIso, nationalNumber).length >= 10;
}
