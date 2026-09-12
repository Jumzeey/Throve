import { Button } from '@/components/ui/button';
import { Palette, Typography } from '@/constants/theme';
import type { Offer } from '@/data/types';
import { formatNaira } from '@/lib/format';
import { effectiveOfferStatus } from '@/lib/offer-display';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  offer: Offer;
  listingPrice: number;
  isBuyer: boolean;
  mine?: boolean;
  buying?: boolean;
  onOpen?: () => void;
  onBuyNow?: () => void;
};

export function ChatOfferCard({
  offer,
  listingPrice,
  isBuyer,
  mine = false,
  buying,
  onOpen,
  onBuyNow,
}: Props) {
  const status = effectiveOfferStatus(offer);
  const showBuy = isBuyer && status === 'accepted' && Boolean(onBuyNow);

  const statusLabel =
    status === 'pending'
      ? 'Pending'
      : status === 'accepted'
        ? 'Accepted'
        : status === 'rejected'
          ? 'Declined'
          : status === 'withdrawn'
            ? 'Cancelled'
            : 'Expired';

  return (
    <Pressable
      onPress={onOpen}
      style={[styles.card, mine ? styles.cardMine : styles.cardTheirs]}
      accessibilityRole="button"
      accessibilityLabel={`Offer ${formatNaira(offer.amount)}, ${statusLabel}`}
    >
      <View style={styles.priceRow}>
        <Text style={styles.amount}>{formatNaira(offer.amount)}</Text>
        {listingPrice > offer.amount ? (
          <Text style={styles.listPrice}>{formatNaira(listingPrice)}</Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.status,
          status === 'accepted' && styles.statusAccepted,
          status === 'pending' && styles.statusPending,
        ]}
      >
        {statusLabel}
      </Text>
      {showBuy ? (
        <Button
          label={buying ? 'Starting…' : 'Buy now'}
          onPress={onBuyNow}
          disabled={buying}
          style={styles.buyBtn}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    maxWidth: '78%',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  cardMine: {
    alignSelf: 'flex-end',
    backgroundColor: Palette.sand,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  cardTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  amount: {
    fontSize: 18,
    fontFamily: Typography.bodyBold,
    color: Palette.espresso,
  },
  listPrice: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.muted2,
    textDecorationLine: 'line-through',
  },
  status: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted,
  },
  statusPending: {
    color: Palette.warningText,
  },
  statusAccepted: {
    color: Palette.successText,
  },
  buyBtn: {
    marginTop: 6,
    alignSelf: 'stretch',
  },
});
