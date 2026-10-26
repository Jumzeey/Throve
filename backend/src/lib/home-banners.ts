import { z } from 'zod';
import type { DbRow } from './db-types.js';

export const BANNER_TARGET_TYPES = [
  'category_browse',
  'department',
  'listing',
  'live',
  'seller',
  'search',
  'url',
] as const;
export const BANNER_THEMES = ['plum', 'espresso', 'gold', 'sand'] as const;

export type HomeBannerDto = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  targetType: (typeof BANNER_TARGET_TYPES)[number];
  targetValue: string | null;
  imageUrl: string | null;
  theme: (typeof BANNER_THEMES)[number];
  sortOrder: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt: string;
};

export function mapHomeBanner(row: DbRow): HomeBannerDto {
  return {
    id: String(row.id),
    title: String(row.title),
    subtitle: row.subtitle ?? null,
    ctaLabel: row.cta_label ?? null,
    targetType: row.target_type,
    targetValue: row.target_value ?? null,
    imageUrl: row.image_url ?? null,
    theme: row.theme,
    sortOrder: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
    startsAt: row.starts_at ?? null,
    endsAt: row.ends_at ?? null,
    updatedAt: String(row.updated_at),
  };
}

/** Live = switched on and inside its schedule (if it has one). */
export function bannerIsLive(row: { active: boolean; starts_at?: string | null; ends_at?: string | null }, now = Date.now()) {
  if (!row.active) return false;
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return false;
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return false;
  return true;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value ? value : null));

export const bannerInput = z
  .object({
    title: z.string().trim().min(1).max(40),
    subtitle: optionalText(80),
    ctaLabel: optionalText(20),
    targetType: z.enum(BANNER_TARGET_TYPES),
    targetValue: optionalText(500),
    imageUrl: z.string().url().nullish().transform((value) => value ?? null),
    theme: z.enum(BANNER_THEMES).default('plum'),
    active: z.boolean().default(true),
    startsAt: z.string().datetime().nullish().transform((value) => value ?? null),
    endsAt: z.string().datetime().nullish().transform((value) => value ?? null),
  })
  .superRefine((value, ctx) => {
    if (value.targetType !== 'category_browse' && !value.targetValue) {
      ctx.addIssue({ code: 'custom', path: ['targetValue'], message: 'Choose where the banner should go' });
    }
    if (value.targetType === 'department' && value.targetValue && !['Women', 'Men', 'Kids'].includes(value.targetValue)) {
      ctx.addIssue({ code: 'custom', path: ['targetValue'], message: 'Department must be Women, Men or Kids' });
    }
    if (value.targetType === 'url' && value.targetValue && !/^https:\/\//i.test(value.targetValue)) {
      ctx.addIssue({ code: 'custom', path: ['targetValue'], message: 'Links must start with https://' });
    }
    if (value.startsAt && value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must be after start' });
    }
  });

export function bannerRowFromInput(input: z.infer<typeof bannerInput>) {
  return {
    title: input.title,
    subtitle: input.subtitle,
    cta_label: input.ctaLabel,
    target_type: input.targetType,
    target_value: input.targetType === 'category_browse' ? null : input.targetValue,
    image_url: input.imageUrl,
    theme: input.theme,
    active: input.active,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
  };
}
