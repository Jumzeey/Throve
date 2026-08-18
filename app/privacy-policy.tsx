import { Palette } from '@/constants/theme';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

const EFFECTIVE_DATE = 'August 18, 2026';

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Privacy Policy" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Throve Privacy Policy</Text>
        <Text style={styles.p}>Effective date: {EFFECTIVE_DATE}</Text>

        <Text style={styles.h2}>1. About this policy</Text>
        <Text style={styles.p}>
          Throve (“we”, “us”, “our”) operates the mobile application “Throve” (the “App”).
          This Privacy Policy explains what information we collect, how we use it, and the choices
          you have regarding your information.
        </Text>

        <Text style={styles.h2}>2. Information we collect</Text>
        <Text style={styles.h3}>Account information</Text>
        <Text style={styles.p}>
          If you use the App, we may collect your email address and profile details (such as your
          name/username) to provide authentication and account features.
        </Text>

        <Text style={styles.h3}>Profile and content you create</Text>
        <Text style={styles.p}>
          We may collect information you add to your profile and seller listings (for example:
          item photos, titles, descriptions, and pricing details).
        </Text>

        <Text style={styles.h3}>Messages and offers</Text>
        <Text style={styles.p}>
          If you use the inbox/chat features, we process message content to enable communication
          between users about products and offers.
        </Text>

        <Text style={styles.h3}>Orders (simulated for prototype)</Text>
        <Text style={styles.p}>
          This prototype uses simulated checkout and does not collect or process real payment
          card/bank information. We may store order details for the purpose of showing the order
          lifecycle inside the App.
        </Text>

        <Text style={styles.h3}>Reviews and ratings</Text>
        <Text style={styles.p}>
          If you submit reviews/ratings after an order is completed, we process the rating and
          any optional comments you include.
        </Text>

        <Text style={styles.h2}>3. How we use information</Text>
        <Text style={styles.p}>
          We use the information we collect to provide, maintain, and improve the App. This includes:
        </Text>
        <Text style={styles.listItem}>• enabling login and account features</Text>
        <Text style={styles.listItem}>• showing products, seller profiles, and order details</Text>
        <Text style={styles.listItem}>• enabling offers, messaging, and review submission</Text>
        <Text style={styles.listItem}>• operating live shopping sessions (where applicable)</Text>

        <Text style={styles.h2}>4. Sharing of information</Text>
        <Text style={styles.p}>
          We do not sell your personal information. We may share information only as needed to operate
          the App and provide its features.
        </Text>
        <Text style={styles.p}>
          For this prototype, we do not process real payments.
        </Text>

        <Text style={styles.h2}>5. Data retention</Text>
        <Text style={styles.p}>
          We retain information for as long as necessary to provide the App, maintain account
          functionality, and comply with applicable legal requirements.
        </Text>

        <Text style={styles.h2}>6. Security</Text>
        <Text style={styles.p}>
          We use commercially reasonable safeguards designed to protect information against
          unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={styles.h2}>7. Your rights</Text>
        <Text style={styles.p}>
          Depending on your location, you may have rights regarding access to and correction/deletion
          of your personal information. If you contact us, we will respond according to applicable law.
        </Text>

        <Text style={styles.h2}>8. Contact us</Text>
        <Text style={styles.p}>
          For privacy questions, contact: <Text style={styles.mono}>privacy@throve.app</Text>
        </Text>

        <Text style={styles.small}>
          Note: This is a prototype privacy policy for the Throve app. Replace the contact email and
          any details that do not match your final production implementation before publishing to stores.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 10,
    gap: 12,
  },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    color: Palette.text,
    marginTop: 4,
  },
  h2: {
    fontSize: 13,
    fontWeight: '800',
    color: Palette.text,
    marginTop: 10,
  },
  h3: {
    fontSize: 12,
    fontWeight: '700',
    color: Palette.text,
    marginTop: 6,
  },
  p: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.muted2,
  },
  listItem: {
    fontSize: 12,
    lineHeight: 18,
    color: Palette.muted2,
    marginLeft: 4,
  },
  mono: {
    fontFamily: 'System',
  },
  small: {
    fontSize: 11,
    lineHeight: 16,
    color: Palette.muted3,
    marginTop: 8,
  },
});

