import { Palette } from '@/constants/theme';
import { isLocalPhotoUri, isPublicPhotoUri } from '@/lib/profile-photo';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  uri?: string | null;
  /** Kept for call-site compatibility; not used for seed/fallback images. */
  username?: string;
  style?: StyleProp<ViewStyle>;
  /** Show a just-picked device file. Stored profile photos must be http(s). */
  allowLocal?: boolean;
};

/**
 * User profile photo when available; otherwise a blank hatch avatar (no seed art, no icon).
 */
export function ProfileAvatar({ uri, style, allowLocal = false }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const usable = Boolean(uri && !failed && (isPublicPhotoUri(uri) || (allowLocal && isLocalPhotoUri(uri))));

  if (usable && uri) {
    return (
      <View style={[styles.wrap, style]}>
        <Image source={{ uri }} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} />
      </View>
    );
  }

  return <View style={[styles.empty, style]} />;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: Palette.hatch },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  empty: {
    backgroundColor: Palette.hatch,
    overflow: 'hidden',
  },
});
