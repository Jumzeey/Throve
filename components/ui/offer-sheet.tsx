import { ErrorBanner } from '@/components/ui/error-banner';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
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
    borderColor: Palette.text,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.background,
  },
  cancelLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.text,
  },
  send: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.text,
  },
  sendLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Palette.background,
  },
});
