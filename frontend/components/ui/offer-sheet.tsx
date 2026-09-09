import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { KeyboardSafeSheet } from '@/components/ui/keyboard-safe';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { minOfferAmount, validateOfferAmount } from '@/context/inbox-context';
import { formatNaira } from '@/lib/format';
import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const QUICK_OFF_PERCENTS = [10, 20, 30] as const;

type QuickOff = (typeof QUICK_OFF_PERCENTS)[number];
type Mode = QuickOff | 'custom';

type Props = {
  visible: boolean;
  listingPrice: number;
  title?: string;
  onClose: () => void;
  onSubmit: (amount: number) => void;
};

function amountForOff(listingPrice: number, off: QuickOff) {
  return Math.max(1, Math.round(listingPrice * (1 - off / 100)));
}

export function OfferSheet({ visible, listingPrice, title = 'Make an offer', onClose, onSubmit }: Props) {
  const [mode, setMode] = useState<Mode>(10);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const min = minOfferAmount(listingPrice);

  const quickOptions = useMemo(
    () =>
      QUICK_OFF_PERCENTS.map((off) => ({
        off,
        amount: amountForOff(listingPrice, off),
        disabled: amountForOff(listingPrice, off) < min || amountForOff(listingPrice, off) >= listingPrice,
      })),
    [listingPrice, min],
  );

  useEffect(() => {
    if (!visible) return;
    const first = quickOptions.find((option) => !option.disabled);
    setMode(first?.off ?? 'custom');
    setCustomAmount('');
    setError(null);
  }, [visible, listingPrice, quickOptions]);

  const selectedAmount = useMemo(() => {
    if (mode === 'custom') {
      return Number(customAmount.replace(/[^\d]/g, '')) || 0;
    }
    return amountForOff(listingPrice, mode);
  }, [customAmount, listingPrice, mode]);

  function pickQuick(off: QuickOff) {
    setMode(off);
    setError(null);
    Keyboard.dismiss();
  }

  function pickCustom() {
    setMode('custom');
    setError(null);
  }

  function submit() {
    const message = validateOfferAmount(selectedAmount, listingPrice);
    if (message) {
      setError(message);
      return;
    }
    Keyboard.dismiss();
    onSubmit(selectedAmount);
    setCustomAmount('');
    setError(null);
  }

  function close() {
    Keyboard.dismiss();
    setCustomAmount('');
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
            <Text style={styles.sub}>Listed at {formatNaira(listingPrice)}</Text>

            <View style={styles.chips}>
              {quickOptions.map((option) => {
                const selected = mode === option.off;
                return (
                  <Pressable
                    key={option.off}
                    disabled={option.disabled}
                    onPress={() => pickQuick(option.off)}
                    style={[
                      styles.chip,
                      selected && styles.chipOn,
                      option.disabled && styles.chipDisabled,
                    ]}>
                    <Text style={[styles.chipAmount, selected && styles.chipAmountOn]}>
                      {formatNaira(option.amount)}
                    </Text>
                    <Text style={[styles.chipOff, selected && styles.chipOffOn]}>{option.off}% off</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={pickCustom}
                style={[styles.chip, mode === 'custom' && styles.chipOn]}>
                <Text style={[styles.chipAmount, mode === 'custom' && styles.chipAmountOn]}>Custom</Text>
                <Text style={[styles.chipOff, mode === 'custom' && styles.chipOffOn]}>Set a price</Text>
              </Pressable>
            </View>

            {mode === 'custom' ? (
              <TextField
                placeholder={`Your offer (min ${formatNaira(min)})`}
                value={customAmount}
                keyboardType="number-pad"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={submit}
                onChangeText={(value) => {
                  setCustomAmount(value.replace(/[^\d]/g, ''));
                  setError(null);
                }}
              />
            ) : (
              <Text style={styles.selectedHint}>
                Offering {formatNaira(selectedAmount)} · minimum {formatNaira(min)}
              </Text>
            )}

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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 72,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  chipOn: {
    borderColor: Palette.plum,
    backgroundColor: Palette.plum,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipAmount: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    textAlign: 'center',
  },
  chipAmountOn: {
    color: Palette.ivory,
  },
  chipOff: {
    fontSize: 11,
    fontFamily: Typography.body,
    color: Palette.successText,
    textAlign: 'center',
  },
  chipOffOn: {
    color: 'rgba(255,247,240,0.85)',
  },
  selectedHint: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.muted,
    marginBottom: 2,
  },
  banner: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: Spacing.md,
  },
  action: {
    flex: 1,
    minHeight: 48,
  },
});
