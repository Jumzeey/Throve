import { useCheckout } from '@/context/checkout-context';
import { Palette, Spacing, Typography } from '@/constants/theme';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

/**
 * Deep-link return from Flutterwave: throveapp://checkout/payment-return?tx_ref=…
 * Verifies payment and routes to confirmation or back to the payment screen states.
 */
export default function PaymentReturnScreen() {
  const router = useRouter();
  const checkout = useCheckout();
  const params = useLocalSearchParams<{ tx_ref?: string; txRef?: string; status?: string }>();
  const txRef = (params.tx_ref ?? params.txRef ?? '').toString();
  const [message, setMessage] = useState('Confirming your payment…');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!txRef) {
      router.replace('/checkout/payment');
      return;
    }

    void (async () => {
      try {
        const result = await checkout.verifyPayment(txRef);
        if (result.status === 'successful') {
          setMessage('Payment confirmed');
          router.replace('/checkout/confirmation');
          return;
        }
        if (result.status === 'failed') {
          router.replace('/checkout/payment');
          return;
        }
        setMessage("We're confirming your payment…");
        router.replace('/checkout/payment');
      } catch {
        router.replace('/checkout/payment');
      }
    })();
  }, [checkout, router, txRef]);

  if (!txRef && !checkout.draft && !checkout.lastOrder) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.screen}>
      <ActivityIndicator color={Palette.plum} />
      <Text style={styles.copy}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  copy: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.body,
    textAlign: 'center',
  },
});
