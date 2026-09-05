import { Palette, Radius, Typography } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

export type ListingChipVariant = 'draft' | 'available' | 'reserved' | 'sold' | 'hidden' | 'removed';
export type OfferChipVariant = 'sent' | 'received' | 'pending' | 'accepted' | 'rejected' | 'countered' | 'withdrawn' | 'expired';
export type LiveChipVariant = 'available' | 'reserved' | 'your_claim' | 'sold' | 'pinned';
export type OrderChipVariant = 'paid' | 'dispatched' | 'in_transit' | 'completed' | 'cancelled';

type ChipConfig = { label: string; color: string; bg?: string; border: string };

const LISTING: Record<ListingChipVariant, ChipConfig> = {
  draft: { label: 'DRAFT', color: Palette.plum, border: '#C9A9BD' },
  available: { label: 'AVAILABLE', color: Palette.successText, border: Palette.successBorder },
  reserved: { label: 'RESERVED', color: Palette.warningText, border: '#E9CFA6', bg: Palette.warningBg },
  sold: { label: 'SOLD', color: Palette.ivory, border: Palette.espresso, bg: Palette.espresso },
  hidden: { label: 'HIDDEN', color: Palette.muted, border: '#D4C7BE' },
  removed: { label: 'NO LONGER AVAILABLE', color: Palette.muted, border: '#D4C7BE' },
};

const OFFER: Record<OfferChipVariant, ChipConfig> = {
  sent: { label: 'Sent', color: Palette.plum, border: '#C9A9BD' },
  received: { label: 'Received', color: Palette.plum, border: '#C9A9BD' },
  pending: { label: 'Pending', color: Palette.warningText, border: '#E9CFA6', bg: Palette.warningBg },
  accepted: { label: 'Accepted', color: Palette.successText, border: Palette.successBorder },
  rejected: { label: 'Rejected', color: Palette.error, border: Palette.errorBorder },
  countered: { label: 'Countered', color: Palette.plum, border: '#C9A9BD' },
  withdrawn: { label: 'Withdrawn', color: Palette.muted, border: '#D4C7BE' },
  expired: { label: 'Expired', color: Palette.muted, border: '#D4C7BE' },
};

const LIVE: Record<LiveChipVariant, ChipConfig> = {
  pinned: { label: 'PINNED', color: Palette.plum, border: 'transparent' },
  available: { label: 'AVAILABLE', color: Palette.successText, border: Palette.successBorder },
  reserved: { label: 'RESERVED', color: Palette.warningText, border: '#E9CFA6', bg: Palette.warningBg },
  your_claim: { label: 'YOUR CLAIM', color: Palette.warningText, border: '#E9CFA6', bg: Palette.warningBg },
  sold: { label: 'SOLD', color: Palette.ivory, border: Palette.espresso, bg: Palette.espresso },
};

const ORDER: Record<OrderChipVariant, ChipConfig> = {
  paid: { label: 'Paid', color: Palette.plum, border: '#C9A9BD', bg: Palette.ivoryElevated },
  dispatched: { label: 'Dispatched', color: Palette.warningText, border: '#E9CFA6', bg: Palette.warningBg },
  in_transit: { label: 'In transit', color: Palette.warningText, border: '#E9CFA6', bg: Palette.warningBg },
  completed: { label: 'Completed', color: Palette.successText, border: Palette.successBorder, bg: Palette.successBg },
  cancelled: { label: 'Cancelled', color: Palette.error, border: Palette.errorBorder, bg: Palette.errorBg },
};

type Props =
  | { kind: 'listing'; variant: ListingChipVariant; label?: string }
  | { kind: 'offer'; variant: OfferChipVariant; label?: string }
  | { kind: 'live'; variant: LiveChipVariant; label?: string }
  | { kind: 'order'; variant: OrderChipVariant; label?: string };

export function StatusChip(props: Props) {
  const cfg =
    props.kind === 'listing'
      ? LISTING[props.variant]
      : props.kind === 'offer'
        ? OFFER[props.variant]
        : props.kind === 'order'
          ? ORDER[props.variant]
          : LIVE[props.variant];
  const text = props.label ?? cfg.label;
  const isLive = props.kind === 'live';

  return (
    <View
      style={[
        styles.chip,
        { borderColor: cfg.border },
        cfg.bg ? { backgroundColor: cfg.bg } : null,
        isLive ? styles.liveChip : null,
      ]}>
      <Text style={[styles.text, isLive ? styles.liveText : null, { color: cfg.color }]}>{text}</Text>
    </View>
  );
}

export function ModeratorBadge() {
  return (
    <View style={styles.modBadge}>
      <Text style={styles.modText}>MOD</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.xs,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  liveChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
  },
  liveText: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: Typography.bodyBold,
  },
  modBadge: {
    borderWidth: 1,
    borderColor: 'rgba(216,138,161,0.5)',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  modText: {
    fontSize: 9,
    fontFamily: Typography.bodyBold,
    letterSpacing: 0.5,
    color: Palette.blush,
  },
});