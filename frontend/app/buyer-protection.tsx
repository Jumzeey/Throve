import { Button } from '@/components/ui/button';
import { ChatBubbleIcon, InfoCircleIcon, ShieldCheckIcon } from '@/components/ui/icons';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Palette, Radius, Typography } from '@/constants/theme';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function BuyerProtectionScreen() {
  const router = useRouter();
  const { sheetBottom } = useScreenInsets();

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Buyer Protection" onBack={() => router.back()} />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: Math.max(sheetBottom, 24) + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroIcon}>
          <ShieldCheckIcon size={28} color={Palette.plum} />
        </View>
        <Text style={styles.heroTitle}>Buyer Protection</Text>
        <Text style={styles.heroBody}>For every purchase made with us, we make sure you’re covered.</Text>

        <Text style={styles.sectionTitle}>How we calculate the fee</Text>
        <Text style={styles.sectionBody}>
          The Buyer Protection fee is 5% of the item price, capped at ₦2,500. It’s shown separately at checkout and
          helps fund refunds, secure payments, and support.
        </Text>

        <View style={styles.card}>
          <InfoCircleIcon size={20} color={Palette.plum} />
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>Refund policy</Text>
            <Text style={styles.cardBody}>
              You can receive a refund if your order was never shipped or is lost, arrives damaged, or is significantly
              not as described. You have 2 days to submit your claim from when you’re notified that an item was
              delivered, even if the item never arrived. Buyers cover the cost of returning an item unless agreed
              otherwise.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <ShieldCheckIcon size={20} color={Palette.plum} />
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>Secure transactions</Text>
            <Text style={styles.cardBody}>
              Your money is held securely throughout the entire transaction. We won’t release it to the seller until
              you receive your order and confirm everything is OK. Payments are encrypted by our payment partner, so
              the seller never sees your payment details.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <ChatBubbleIcon size={20} color={Palette.plum} />
          <View style={styles.cardCopy}>
            <Text style={styles.cardTitle}>Our support</Text>
            <Text style={styles.cardBody}>
              Reach out to our support team at any time if something goes wrong with an order. We’ll help you resolve
              eligible issues covered by Buyer Protection.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(sheetBottom, 16) }]}>
        <Button label="Got it" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.ivory,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 14,
  },
  heroIcon: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  heroTitle: {
    textAlign: 'center',
    fontFamily: Typography.display,
    fontSize: 28,
    color: Palette.espresso,
  },
  heroBody: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  sectionBody: {
    fontSize: 13.5,
    lineHeight: 21,
    fontFamily: Typography.body,
    color: Palette.body,
    marginTop: -6,
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    padding: 14,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
    backgroundColor: Palette.ivory,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
