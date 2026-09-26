import { Image, type ImageStyle, type StyleProp } from 'react-native';

/** Official Throve mark (plum T in arrow circle), transparent and tightly cropped. */
export const throveLogo = require('@/assets/images/throve-mark.png');

export function ThroveLogo({
  style,
  size = 48,
}: {
  style?: StyleProp<ImageStyle>;
  size?: number;
}) {
  return (
    <Image
      source={throveLogo}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel="Throve"
      accessibilityIgnoresInvertColors
    />
  );
}
