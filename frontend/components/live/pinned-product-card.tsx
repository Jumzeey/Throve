import { AppImage } from '@/components/ui/app-image';
import { Button } from '@/components/ui/button';
import { PinIcon } from '@/components/ui/icons';
import { StatusChip, type LiveChipVariant } from '@/components/ui/status-chip';
import { Palette, Radius, Shadows, Typography } from '@/constants/theme';
import { getProductImageSource } from '@/data/images';
import { StyleSheet, Text, View } from 'react-native';

export type PinnedProductVariant = 'available' | 'your_claim' | 'reserved' | 'sold';

type Props = {
  title: string;
  subtitle?: string;
  price: string;
  listingId?: string;
  imageUri?: string;
  variant: PinnedProductVariant;
  countdown?: string;
  role?: 'viewer' | 'host';
  claimError?: string | null;
  onClaim?: () => void;
  onBuyNow?: () => void;
  onCheckout?: () => void;
  onChangeProduct?: () => void;
  onNextProduct?: () => void;
};

const STATUS_MAP: Record<PinnedProductVariant, LiveChipVariant> = {
  available: 'available',
  your_claim: 'your_claim',
  reserved: 'reserved',
  sold: 'sold',
};

export function PinnedProductCard({
  title,
  subtitle,
  price,
  listingId,
  imageUri,
  variant,
  countdown,
  role = 'viewer',
  claimError,
  onClaim,
  onBuyNow,
  onCheckout,
  onChangeProduct,
  onNextProduct,
}: Props) {
  const dimmed = variant === 'reserved';
  const sold = variant === 'sold';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.pinnedRow}>
          <PinIcon size={13} color={Palette.plum} />
          <Text style={styles.pinnedLabel}>PINNED</Text>
        </View>
        <StatusChip kind="live" variant={STATUS_MAP[variant]} />
      </View>

      <View style={[styles.body, dimmed && styles.bodyDimmed]}>
        <AppImage source={getProductImageSource(imageUri, listingId)} style={styles.thumb} />
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <Text style={[styles.price, sold && styles.priceSold]}>{price}</Text>
        </View>
      </View>

      {variant === 'your_claim' && countdown ? (
        <View style={styles.countdownRow}>
          <Text style={styles.countdownLabel}>Your claim · time remaining</Text>
          <Text style={styles.countdownValue}>{countdown}</Text>
        </View>
      ) : null}

      {claimError ? <Text style={styles.error}>{claimError}</Text> : null}

      {role === 'viewer' ? (
        <ViewerActions
          variant={variant}
          onClaim={onClaim}
          onBuyNow={onBuyNow}
          onCheckout={onCheckout}
        />
      ) : (
        <HostActions variant={variant} onChangeProduct={onChangeProduct} onNextProduct={onNextProduct} />
      )}

      {variant === 'your_claim' ? (
        <Text style={styles.footnote}>
          This reservation is temporary. Complete checkout before the timer ends or the item returns to Available.
        </Text>
      ) : null}
      {variant === 'reserved' && role === 'viewer' ? (
        <Text style={styles.footnote}>
          Temporarily unavailable — another viewer is completing checkout. If the claim expires it returns to Available.
        </Text>
      ) : null}
      {variant === 'reserved' && role === 'host' ? (
        <Text style={styles.footnote}>
          A viewer is completing checkout. If they don't finish, it returns to Available.
        </Text>
      ) : null}
      {sold ? (
        <Text style={[styles.footnote, styles.footnoteCenter]}>
          {role === 'host' ? "Sold items can't be claimed or bought again." : 'Sold in this live'}
        </Text>
      ) : null}
    </View>
  );
}

function ViewerActions({
  variant,
  onClaim,
  onBuyNow,
  onCheckout,
}: {
  variant: PinnedProductVariant;
  onClaim?: () => void;
  onBuyNow?: () => void;
  onCheckout?: () => void;
}) {
  if (variant === 'your_claim') {
    return <Button label="Complete checkout" onPress={onCheckout} style={styles.actionFull} />;
  }
  if (variant === 'sold') {
    return (
      <View style={styles.soldBanner}>
        <Text style={styles.soldBannerText}>Sold in this live</Text>
      </View>
    );
  }
  if (variant === 'reserved') {
    return (
      <View style={styles.actionRow}>
        <Button label="Claim" variant="secondary" disabled style={styles.actionHalf} />
        <Button label="Buy now" disabled style={styles.actionWide} />
      </View>
    );
  }
  return (
    <View style={styles.actionRow}>
      <Button label="Claim" variant="secondary" onPress={onClaim} style={styles.actionHalf} />
      <Button label="Buy now" onPress={onBuyNow ?? onClaim} style={styles.actionWide} />
    </View>
  );
}

function HostActions({
  variant,
  onChangeProduct,
  onNextProduct,
}: {
  variant: PinnedProductVariant;
  onChangeProduct?: () => void;
  onNextProduct?: () => void;
}) {
  if (variant === 'sold') {
    return <Button label="Move to next product" onPress={onNextProduct} style={styles.actionFull} />;
  }
  return (
    <View style={styles.actionRow}>
      <Button label="Change product" variant="secondary" onPress={onChangeProduct} style={styles.actionHalf} />
      <Button label="Next product" onPress={onNextProduct} style={styles.actionWide} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,247,240,0.97)',
    borderRadius: Radius.lg,
    padding: 12,
    ...Shadows.liveCard,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  pinnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinnedLabel: {
    fontSize: 10,
    fontFamily: Typography.bodyBold,
    letterSpacing: 1,
    color: Palette.plum,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bodyDimmed: {
    opacity: 0.6,
  },
  thumb: {
    width: 66,
    height: 76,
    borderRadius: 6,
    backgroundColor: Palette.skeleton,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    lineHeight: 18,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  price: {
    marginTop: 5,
    fontSize: 18,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
    fontVariant: ['tabular-nums'],
  },
  priceSold: {
    color: Palette.muted,
    textDecorationLine: 'line-through',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  countdownLabel: {
    fontSize: 11.5,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  countdownValue: {
    fontSize: 26,
    lineHeight: 26,
    fontFamily: Typography.display,
    color: Palette.plum,
    fontVariant: ['tabular-nums'],
  },
  error: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.error,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },
  actionHalf: {
    flex: 1,
    minHeight: 46,
  },
  actionWide: {
    flex: 1.35,
    minHeight: 46,
  },
  actionFull: {
    marginTop: 12,
    minHeight: 46,
  },
  soldBanner: {
    marginTop: 12,
    minHeight: 46,
    borderRadius: Radius.pill,
    backgroundColor: Palette.accent200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBannerText: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
  },
  footnote: {
    marginTop: 9,
    fontSize: 10.5,
    lineHeight: 16,
    fontFamily: Typography.body,
    color: Palette.muted2,
  },
  footnoteCenter: {
    textAlign: 'center',
  },
});
