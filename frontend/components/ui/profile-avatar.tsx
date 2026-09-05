import { AppImage } from '@/components/ui/app-image';
import { getSellerAvatar } from '@/data/images';
import { isLocalPhotoUri, isPublicPhotoUri } from '@/lib/profile-photo';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  uri?: string | null;
  username?: string;
  style?: StyleProp<ViewStyle>;
  /** Show a just-picked device file. Stored profile photos must be http(s). */
  allowLocal?: boolean;
};

export function ProfileAvatar({ uri, username, style, allowLocal = false }: Props) {
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

  return <AppImage source={username ? getSellerAvatar(username) : null} style={style} />;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
});
