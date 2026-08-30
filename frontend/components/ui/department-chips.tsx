import { Palette, Typography } from '@/constants/theme';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

type Chip = { label: string; value: string };
type Props = { chips: Chip[]; selected: string; onSelect: (value: string) => void };

export function DepartmentChips({ chips, selected, onSelect }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chips.map((chip) => {
        const active = selected === chip.value;
        return (
          <Pressable key={chip.label} onPress={() => onSelect(chip.value)} style={[styles.chip, active ? styles.active : styles.idle]}>
            <Text style={[styles.label, active ? styles.activeLabel : styles.idleLabel]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingRight: 8 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    justifyContent: 'center',
  },
  active: {
    backgroundColor: Palette.plum,
  },
  idle: {
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  label: { fontSize: 12.5, fontFamily: Typography.bodySemiBold },
  activeLabel: { color: Palette.ivory },
  idleLabel: { color: Palette.body },
});
