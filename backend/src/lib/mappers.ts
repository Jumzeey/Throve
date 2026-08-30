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

export function mapProfile(row: ProfileRow, sellerUsername?: string) {
  return {
    userId: row.id,
    email: row.email,
    name: row.name,
    username: row.username,
    dob: row.dob ?? '',
    bio: row.bio,
    location: row.location,
    photoUri: row.photo_url ?? undefined,
    phone: row.phone ?? undefined,
    setupComplete: row.setup_complete,
    canHostLive: row.can_host_live,
    deactivated: row.deactivated,
    notifOffers: row.notif_offers,
    notifMessages: row.notif_messages,
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
  const { data, error } = await supabase.from('profiles').select('*').eq('username', username).maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
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
