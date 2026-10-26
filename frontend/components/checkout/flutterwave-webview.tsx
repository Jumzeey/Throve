import { CloseIcon, LockIcon } from '@/components/ui/icons';
import { Palette, Typography } from '@/constants/theme';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

export type FlutterwaveOutcome = 'successful' | 'cancelled' | 'failed' | 'unknown';

type Props = {
  url: string | null;
  /** Where Flutterwave sends the buyer when done, e.g. throveapp://checkout/payment-return. */
  redirectUrl: string;
  onFinish: (outcome: FlutterwaveOutcome) => void;
  onClose: () => void;
};

function outcomeFrom(url: string): FlutterwaveOutcome {
  const status = /[?&]status=([^&#]+)/i.exec(url)?.[1]?.toLowerCase() ?? '';
  if (status === 'successful' || status === 'completed') return 'successful';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'failed') return 'failed';
  return 'unknown';
}

/** Flutterwave's hosted checkout inside the app, so buyers never leave Throve to pay. */
export function FlutterwaveWebView({ url, redirectUrl, onFinish, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const intercept = (request: Pick<WebViewNavigation, 'url'>) => {
    const next = request.url;
    if (next.startsWith(redirectUrl)) {
      onFinish(outcomeFrom(next));
      return false;
    }
    // Bank apps, USSD and other app links can't open in a web view; hand them to the phone.
    if (!/^https?:\/\//i.test(next) && !next.startsWith('about:')) {
      void Linking.openURL(next).catch(() => undefined);
      return false;
    }
    return true;
  };

  return (
    <Modal visible={Boolean(url)} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <LockIcon size={14} color={Palette.plum} />
            <Text style={styles.title}>Secure payment</Text>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close payment"
            style={styles.close}
          >
            <CloseIcon size={16} color={Palette.espresso} />
          </Pressable>
        </View>
        {url ? (
          <WebView
            source={{ uri: url }}
            style={styles.web}
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={intercept}
            onNavigationStateChange={(state) => {
              // Android sometimes skips onShouldStartLoadWithRequest for redirects.
              if (state.url?.startsWith(redirectUrl)) onFinish(outcomeFrom(state.url));
            }}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={Palette.plum} />
              </View>
            )}
          />
        ) : null}
        <View style={{ height: insets.bottom, backgroundColor: Palette.ivory }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.ivory },
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontFamily: Typography.bodySemiBold, color: Palette.espresso },
  close: { padding: 6 },
  web: { flex: 1, backgroundColor: Palette.ivory },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
