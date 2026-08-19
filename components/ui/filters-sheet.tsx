import { Button } from '@/components/ui/button';
import { Palette, Radius, Shadows, Typography } from '@/constants/theme';
import { CONDITIONS, DEPARTMENTS, FILTER_BRANDS } from '@/data/seed';
import { DEFAULT_FILTERS, PRICE_BANDS, SORT_OPTIONS } from '@/data/filter-listings';
import type { ListingFilters } from '@/data/types';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  value: ListingFilters;
  onClose: () => void;
  onApply: (filters: ListingFilters) => void;
  showDepartment?: boolean;
};

export function FiltersSheet({ visible, value, onClose, onApply, showDepartment = false }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  function toggle(key: keyof ListingFilters, next: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key] === next ? (key === 'sort' ? 'Newest' : '') : next,
      ...(key === 'department' ? { category: '' } : null),
    }));
  }

  function clear() {
    setDraft({
      ...DEFAULT_FILTERS,
      department: showDepartment ? '' : value.department,
      category: showDepartment ? '' : value.category,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters & Sort</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {showDepartment ? (
              <Section label="Department / Category">
                <ChipRow
                  options={DEPARTMENTS}
                  selected={draft.department}
                  onSelect={(item) => toggle('department', item)}
                />
              </Section>
            ) : null}
            <Section label="Brand">
              <ChipRow options={FILTER_BRANDS} selected={draft.brand} onSelect={(item) => toggle('brand', item)} />
            </Section>
            <Section label="Condition">
              <ChipRow options={CONDITIONS} selected={draft.condition} onSelect={(item) => toggle('condition', item)} />
            </Section>
            <Section label="Price">
              <ChipRow options={PRICE_BANDS} selected={draft.price} onSelect={(item) => toggle('price', item)} />
            </Section>
            <Section label="Sort">
              <ChipRow options={SORT_OPTIONS} selected={draft.sort} onSelect={(item) => toggle('sort', item)} />
            </Section>
          </ScrollView>
          <View style={styles.actions}>
            <Button label="Clear filters" variant="secondary" onPress={clear} style={styles.action} />
            <Button label="Apply" onPress={() => onApply(draft)} style={styles.action} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function ChipRow({
  options,
  selected,
  onSelect,
}: {
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const active = selected === option;
        return (
          <Pressable key={option} onPress={() => onSelect(option)} style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelIdle]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23,23,23,0.3)',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: Palette.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingTop: 20,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontFamily: Typography.heading,
    color: Palette.text,
  },
  close: {
    fontSize: 18,
    color: Palette.muted2,
  },
  body: {
    paddingBottom: 8,
  },
  section: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Palette.accent,
  },
  chipIdle: {
    backgroundColor: Palette.background,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  chipLabel: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
  },
  chipLabelActive: {
    color: Palette.background,
  },
  chipLabelIdle: {
    color: Palette.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  action: {
    flex: 1,
    height: 46,
    borderRadius: 8,
  },
});
