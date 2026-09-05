type ProfileRow = {
  id: string;
  email: string;
  name: string;
  username: string;
  dob: string | null;
  bio: string;
  location: string;
  photo_url: string | null;
  phone: string | null;
  setup_complete: boolean;
  can_host_live: boolean;
  deactivated: boolean;
  notif_offers: boolean;
  notif_messages: boolean;
  preferred_login_method?: 'password' | 'magic_link' | null;
  has_password?: boolean | null;
};

type ListingRow = {
  id: string;
  seller_id: string;
  title: string;
  brand: string;
  price: number;
  size: string;
  condition: string;
  department: string;
  category: string;
  status: string;
  description: string;
  shipping: string;
  colour: string | null;
  photo_urls: string[];
  created_at: string;
};

export function publicPhotoUrl(value: string | null | undefined) {
  if (!value) return undefined;
  if (value.startsWith('https://') || value.startsWith('http://')) return value;
  return undefined;
}

/** Ignore device-only paths (file://) so they cannot overwrite a stored public URL. */
export function storedPhotoUrl(value?: string) {
  if (value === undefined) return undefined;
  if (!value) return null;
  return publicPhotoUrl(value) ?? undefined;
}

export function mapProfile(row: ProfileRow, sellerUsername?: string) {
  return {
    userId: row.id,
    email: row.email,
    name: row.name,
    username: row.username,
    dob: row.dob ?? '',
    bio: row.bio,
    location: row.location,
    photoUri: publicPhotoUrl(row.photo_url),
    phone: row.phone ?? undefined,
    setupComplete: row.setup_complete,
    canHostLive: row.can_host_live,
    deactivated: row.deactivated,
    notifOffers: row.notif_offers,
    notifMessages: row.notif_messages,
    preferredLoginMethod: row.preferred_login_method === 'magic_link' ? 'magic_link' : 'password',
    hasPassword: Boolean(row.has_password),
    sellerUsername,
  };
}

export function mapListing(row: ListingRow, sellerUsername: string, savedBy: string[] = []) {
  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    price: row.price,
    size: row.size,
    condition: row.condition,
    department: row.department,
    category: row.category,
    seller: sellerUsername,
    status: row.status,
    description: row.description,
    shipping: row.shipping,
    photoCount: row.photo_urls?.length ?? 0,
    photoUrls: row.photo_urls ?? [],
    createdAt: row.created_at.slice(0, 10),
    colour: row.colour ?? undefined,
    savedBy,
  };
}

export async function getProfileById(supabase: ReturnType<typeof import('./supabase.js').createSupabaseClient>, id: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

export async function getProfileByUsername(
  supabase: ReturnType<typeof import('./supabase.js').createSupabaseClient>,
  username: string,
) {
  const escaped = username.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const { data, error } = await supabase.from('profiles').select('*').ilike('username', escaped).limit(1);
  if (error) throw error;
  return (data?.[0] as ProfileRow | undefined) ?? null;
}

export async function getSellerMap(
  supabase: ReturnType<typeof import('./supabase.js').createSupabaseClient>,
  sellerIds: string[],
) {
  if (!sellerIds.length) return new Map<string, string>();
  const { data, error } = await supabase.from('profiles').select('id, username').in('id', sellerIds);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.id as string, row.username as string]));
}

export function escapeIlike(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export type SellerSearchCard = {
  username: string;
  photoUri?: string;
  location: string;
  avg: number;
  count: number;
};

export async function getSellerCards(
  supabase: ReturnType<typeof import('./supabase.js').createSupabaseClient>,
  usernames: string[],
): Promise<SellerSearchCard[]> {
  if (!usernames.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, location, photo_url, deactivated')
    .in('username', usernames)
    .eq('deactivated', false);
  if (profileError) throw profileError;

  const ids = (profiles ?? []).map((row) => row.id as string);
  const stats = new Map<string, { sum: number; count: number }>();
  if (ids.length) {
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('seller_id, rating')
      .in('seller_id', ids);
    if (reviewError) throw reviewError;
    for (const row of reviews ?? []) {
      const current = stats.get(row.seller_id as string) ?? { sum: 0, count: 0 };
      current.sum += Number(row.rating);
      current.count += 1;
      stats.set(row.seller_id as string, current);
    }
  }

  const byUsername = new Map((profiles ?? []).map((row) => [row.username as string, row]));
  return usernames.map((username) => {
    const profile = byUsername.get(username);
    const rating = profile ? stats.get(profile.id as string) : undefined;
    return {
      username,
      photoUri: publicPhotoUrl(profile?.photo_url as string | null | undefined),
      location: String(profile?.location ?? ''),
      avg: rating && rating.count ? rating.sum / rating.count : 0,
      count: rating?.count ?? 0,
    };
  });
}
