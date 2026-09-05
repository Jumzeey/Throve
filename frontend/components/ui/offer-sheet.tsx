import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { KeyboardSafeSheet } from '@/components/ui/keyboard-safe';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Shadows, Typography } from '@/constants/theme';
import { minOfferAmount, validateOfferAmount } from '@/context/inbox-context';
import { formatNaira } from '@/lib/format';
import { useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  listingPrice: number;
  title?: string;
  onClose: () => void;
  onSubmit: (amount: number) => void;
};

export function OfferSheet({ visible, listingPrice, title = 'Make an offer', onClose, onSubmit }: Props) {
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
    Keyboard.dismiss();
    onSubmit(value);
    setAmount('');
    setError(null);
  }

  function close() {
    Keyboard.dismiss();
    setAmount('');
    setError(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.overlay}>
        <KeyboardSafeSheet onDismiss={close} style={styles.sheet}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>
              Listed at {formatNaira(listingPrice)} · minimum {formatNaira(min)}
            </Text>
            <TextField
              placeholder="Your offer (₦)"
              value={amount}
              keyboardType="number-pad"
              autoFocus={false}
              returnKeyType="done"
              onSubmitEditing={submit}
              onChangeText={(value) => {
                setAmount(value.replace(/[^\d]/g, ''));
                setError(null);
              }}
            />
            {error ? <AlertBanner variant="error" title="Invalid offer" message={error} style={styles.banner} /> : null}
            <View style={styles.row}>
              <Button label="Cancel" variant="secondary" onPress={close} style={styles.action} />
              <Button label="Send offer" onPress={submit} style={styles.action} />
            </View>
          </Pressable>
        </KeyboardSafeSheet>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Palette.liveOverlay,
  },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadows.lg,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 21,
    fontFamily: Typography.display,
    color: Palette.espresso,
    marginBottom: 4,
  },
  sub: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.muted,
    marginBottom: 14,
  },
  banner: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  action: {
    flex: 1,
    minHeight: 48,
  },
});
