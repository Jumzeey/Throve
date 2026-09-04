export type CountryDialCode = {
  iso: string;
  name: string;
  dial: string;
  flag: string;
};

/** Markets Throve targets first — Nigeria default. */
export const COUNTRY_DIAL_CODES: CountryDialCode[] = [
  { iso: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬' },
  { iso: 'GH', name: 'Ghana', dial: '233', flag: '🇬🇭' },
  { iso: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪' },
  { iso: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦' },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸' },
  { iso: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦' },
];

export const DEFAULT_COUNTRY_ISO = 'NG';

export function getCountryByIso(iso: string) {
  return COUNTRY_DIAL_CODES.find((c) => c.iso === iso) ?? COUNTRY_DIAL_CODES[0];
}
