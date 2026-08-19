import { Palette, Radius, Typography } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: Radius.sm,
  },
  text: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.errorText,
  },
});
