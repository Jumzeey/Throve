/** Nigerian states for checkout shipping. */
export const NIGERIA_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

export type NigeriaState = (typeof NIGERIA_STATES)[number];

/** Map Google Places admin area names onto our Nigeria state list. */
export function matchNigeriaState(value: string | null | undefined) {
  if (!value) return '';
  const cleaned = value
    .replace(/\s+State$/i, '')
    .replace(/^Federal Capital Territory$/i, 'FCT')
    .replace(/^Abuja$/i, 'FCT')
    .trim();
  const found = NIGERIA_STATES.find((state) => state.toLowerCase() === cleaned.toLowerCase());
  return found ?? cleaned;
}
