import { Palette } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
  copy: string;
};

export function ComingSoonScreen({ title, copy }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>
        <Text style={styles.copy}>{copy}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.text,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  copy: {
    fontSize: 14,
    lineHeight: 22,
    color: Palette.muted,
  },
});
