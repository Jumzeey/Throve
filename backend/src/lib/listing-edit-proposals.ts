import { z } from 'zod';
import type { DbRow } from './db-types.js';
import { categoriesForDepartment } from './listing-catalog.js';

/** Listing fields a super admin can suggest changes to (photos stay the seller's). */
export const PROPOSABLE_FIELDS = [
  'title',
  'description',
  'brand',
  'department',
  'category',
  'size',
  'colour',
  'condition',
  'price',
] as const;
export type ProposableField = (typeof PROPOSABLE_FIELDS)[number];

export const FIELD_LABELS: Record<ProposableField, string> = {
  title: 'Title',
  description: 'Description',
  brand: 'Brand',
  department: 'Department',
  category: 'Category',
  size: 'Size',
  colour: 'Colour',
  condition: 'Condition',
  price: 'Price',
};

export const proposalChangesSchema = z
  .object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().max(1000),
    brand: z.string().trim().max(60),
    department: z.enum(['Women', 'Men', 'Kids']),
    category: z.string().trim().min(1).max(40),
    size: z.string().trim().max(30),
    colour: z.string().trim().max(40),
    condition: z.string().trim().min(1).max(40),
    price: z.number().int().positive().max(100_000_000),
  })
  .partial();

export type ProposalChanges = z.infer<typeof proposalChangesSchema>;

function normalised(value: unknown) {
  return typeof value === 'string' ? value.trim() : value ?? null;
}

/** Keep only fields that actually differ from the listing; returns [changes, previous]. */
export function diffAgainstListing(listing: DbRow, changes: ProposalChanges) {
  const kept: Record<string, unknown> = {};
  const previous: Record<string, unknown> = {};
  for (const field of PROPOSABLE_FIELDS) {
    if (!(field in changes)) continue;
    const next = normalised((changes as Record<string, unknown>)[field]);
    const current = normalised(listing[field]);
    if (next === current) continue;
    kept[field] = next;
    previous[field] = listing[field] ?? null;
  }
  return { changes: kept, previous };
}

/** The department/category pair after applying the changes must still be valid. */
export function validateProposalForListing(listing: DbRow, changes: Record<string, unknown>) {
  const department = String(changes.department ?? listing.department);
  const category = String(changes.category ?? listing.category);
  if (!categoriesForDepartment(department).includes(category)) {
    return `Category “${category}” isn’t valid for ${department}`;
  }
  return null;
}

export function mapProposal(row: DbRow | null | undefined) {
  if (!row) return null;
  const changes = (row.changes ?? {}) as Record<string, unknown>;
  const previous = (row.previous ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    status: String(row.status) as 'proposed' | 'accepted' | 'rejected' | 'superseded' | 'withdrawn',
    note: row.note ?? null,
    sellerNote: row.seller_note ?? null,
    createdAt: String(row.created_at),
    respondedAt: row.responded_at ?? null,
    fields: Object.keys(changes)
      .filter((key): key is ProposableField => (PROPOSABLE_FIELDS as readonly string[]).includes(key))
      .map((field) => ({
        field,
        label: FIELD_LABELS[field],
        from: previous[field] ?? null,
        to: changes[field] ?? null,
      })),
  };
}

/** Latest proposal for a listing (any status), for showing the current state to both sides. */
export async function loadLatestProposal(
  service: { from: (table: string) => any },
  listingId: string,
) {
  const { data } = await service
    .from('listing_edit_proposals')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as DbRow | null) ?? null;
}
