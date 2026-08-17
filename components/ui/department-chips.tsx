import { Palette } from '@/constants/theme';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

type Chip = {
  label: string;
  value: string;
};

type Props = {
  chips: Chip[];
  selected: string;
  onSelect: (value: string) => void;
};

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
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
  },
  active: {
    backgroundColor: Palette.text,
  },
  idle: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeLabel: {
    color: Palette.background,
  },
  idleLabel: {
    color: Palette.text,
  },
});
