import { ErrorBanner } from '@/components/ui/error-banner';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Shadows, Typography } from '@/constants/theme';
import { minOfferAmount, validateOfferAmount } from '@/context/inbox-context';
import { formatNaira } from '@/lib/format';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  listingPrice: number;
  onClose: () => void;
  onSubmit: (amount: number) => void;
};

export function OfferSheet({ visible, listingPrice, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const min = minOfferAmount(listingPrice);

  function submit() {
    const value = Number(amount.replace(/[^\d]/g, ''));
    const message = validateOfferAmount(value, listingPrice);
    if (message) {
      setError(message);
      return;
    }
    onSubmit(value);
    setAmount('');
    setError(null);
  }

  function close() {
    setAmount('');
    setError(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Make an offer</Text>
          <Text style={styles.sub}>
            Listed at {formatNaira(listingPrice)} · minimum {formatNaira(min)}
          </Text>
          <TextField
            placeholder="Your offer (₦)"
            value={amount}
            keyboardType="number-pad"
            onChangeText={(value) => {
              setAmount(value.replace(/[^\d]/g, ''));
              setError(null);
            }}
          />
          <ErrorBanner message={error} />
          <View style={styles.row}>
            <Pressable onPress={close} style={styles.cancel}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable onPress={submit} style={styles.send}>
              <Text style={styles.sendLabel}>Send offer</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23,23,23,0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    ...Shadows.lg,
    padding: 20,
  },
  title: {
    fontSize: 17,
    fontFamily: Typography.heading,
    color: Palette.text,
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    color: Palette.muted2,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancel: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: Palette.accent,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  cancelLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.accent700,
  },
  send: {
    flex: 1,
    height: 46,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.accent,
  },
  sendLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.background,
  },
});
