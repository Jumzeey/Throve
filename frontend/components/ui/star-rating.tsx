import { Palette } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

type Props = {
  rating: number;
  size?: number;
  color?: string;
};

export function StarRating({ rating, size = 14, color = Palette.gold }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={rating >= star ? 'star' : rating >= star - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={rating >= star - 0.5 ? color : Palette.neutral300}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 1 },
});
