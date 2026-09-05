import { Button } from '@/components/ui/button';
import { CheckIcon, CloseIcon } from '@/components/ui/icons';
import { PickerField } from '@/components/ui/picker-field';
import { Palette, Radius, Shadows, Typography } from '@/constants/theme';
import { CONDITIONS, DEPARTMENTS, FILTER_BRANDS, FILTER_SIZES, getCategoriesForDepartment } from '@/data/seed';
import { DEFAULT_FILTERS, parseAmount, SORT_OPTIONS } from '@/data/filter-listings';
import type { ListingFilters, SortOption } from '@/data/types';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  value: ListingFilters;
  onClose: () => void;
  onApply: (filters: ListingFilters) => void;
  showDepartment?: boolean;
};

function formatPriceDigits(digits: string) {
  if (!digits) return '';
  return parseAmount(digits).toLocaleString('en-NG');
}

export function FiltersSheet({ visible, value, onClose, onApply, showDepartment = false }: Props) {
  const { sheetBottom } = useScreenInsets();
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  function setField<K extends keyof ListingFilters>(key: K, next: ListingFilters[K]) {
    setDraft((current) => ({
      ...current,
      [key]: next,
      ...(key === 'department' ? { category: '' } : null),
    }));
  }

  function toggle(key: 'size' | 'condition', next: string) {
    setDraft((current) => ({
      ...current,
      [key]: current[key] === next ? '' : next,
    }));
  }

  function clear() {
    setDraft({
      ...DEFAULT_FILTERS,
      sort: value.sort,
      department: showDepartment ? '' : value.department,
      category: showDepartment ? '' : value.category,
    });
  }

  const categoryLabel = draft.department ? `Category in ${draft.department}` : 'Category';
  const categories = draft.department ? getCategoriesForDepartment(draft.department) : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: sheetBottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <CloseIcon size={17} color={Palette.muted} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {showDepartment ? (
              <Section label="Department">
                <ChipRow
                  options={DEPARTMENTS}
                  selected={draft.department}
                  allLabel="All"
                  onSelect={(item) => setField('department', item)}
                />
              </Section>
            ) : null}
            {showDepartment && draft.department ? (
              <Section label={categoryLabel}>
                <ChipRow
                  options={categories}
                  selected={draft.category}
                  allLabel="All"
                  onSelect={(item) => setField('category', item)}
                />
                <Text style={styles.hint}>
                  Category options follow the selected Department — Grooming only appears under Men.
                </Text>
              </Section>
            ) : null}
            <Section label="Brand">
              <PickerField
                value={draft.brand}
                options={['Any brand', ...FILTER_BRANDS]}
                placeholder="Any brand"
                onSelect={(item) => setField('brand', item === 'Any brand' ? '' : item)}
              />
            </Section>
            <Section label="Size">
              <ChipRow options={FILTER_SIZES} selected={draft.size} onSelect={(item) => toggle('size', item)} />
            </Section>
            <Section label="Condition">
              <ChipRow
                options={CONDITIONS}
                selected={draft.condition}
                onSelect={(item) => toggle('condition', item)}
              />
            </Section>
            <Section label="Price">
              <View style={styles.priceRow}>
                <PriceField
                  value={draft.priceMin}
                  placeholder="min"
                  onChange={(next) => setField('priceMin', next)}
                />
                <Text style={styles.priceTo}>to</Text>
                <PriceField
                  value={draft.priceMax}
                  placeholder="max"
                  onChange={(next) => setField('priceMax', next)}
                />
              </View>
            </Section>
          </ScrollView>
          <View style={styles.actions}>
            <Button label="Clear filters" variant="secondary" onPress={clear} style={styles.clearBtn} />
            <Button label="Apply filters" onPress={() => onApply(draft)} style={styles.applyBtn} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type SortSheetProps = {
  visible: boolean;
  value: SortOption;
  onClose: () => void;
  onSelect: (sort: SortOption) => void;
};

export function SortSheet({ visible, value, onClose, onSelect }: SortSheetProps) {
  const { sheetBottom } = useScreenInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sortSheet, { paddingBottom: sheetBottom }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Sort by</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <CloseIcon size={17} color={Palette.muted} />
            </Pressable>
          </View>
          {SORT_OPTIONS.map((option, index) => {
            const active = option === value;
            const last = index === SORT_OPTIONS.length - 1;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
                style={[styles.sortRow, !last && styles.sortRowBorder]}>
                <Text style={[styles.sortLabel, active && styles.sortLabelActive]}>{option}</Text>
                {active ? <CheckIcon size={17} color={Palette.plum} /> : null}
              </Pressable>
            );
          })}
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
  allLabel,
}: {
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  allLabel?: string;
}) {
  const chips = allLabel ? [{ label: allLabel, value: '' }, ...options.map((item) => ({ label: item, value: item }))] : options.map((item) => ({ label: item, value: item }));
  return (
    <View style={styles.chips}>
      {chips.map((chip) => {
        const active = selected === chip.value;
        return (
          <Pressable
            key={chip.label}
            onPress={() => onSelect(chip.value)}
            style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}>
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : styles.chipLabelIdle]}>{chip.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PriceField({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (digits: string) => void;
}) {
  return (
    <View style={styles.priceField}>
      <Text style={styles.naira}>₦</Text>
      <TextInput
        value={formatPriceDigits(value)}
        onChangeText={(text) => onChange(text.replace(/[^\d]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={Palette.label}
        keyboardType="number-pad"
        style={styles.priceInput}
      />
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
    maxHeight: '92%',
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  sortSheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    paddingBottom: 18,
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Palette.accent200,
  },
  title: {
    fontSize: 21,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    gap: 20,
  },
  section: {
    gap: 9,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  hint: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: Palette.muted,
    marginTop: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: Palette.plum,
    borderColor: Palette.plum,
  },
  chipIdle: {
    backgroundColor: Palette.ivory,
    borderColor: Palette.border,
  },
  chipLabel: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  chipLabelActive: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  chipLabelIdle: {
    color: Palette.body,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceField: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.sm,
  },
  naira: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.body,
    fontVariant: ['tabular-nums'],
    color: Palette.espresso,
    paddingVertical: 0,
  },
  priceTo: {
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.label,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 20,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: Palette.accent200,
    backgroundColor: Palette.ivoryElevated,
  },
  clearBtn: {
    flex: 1,
    minHeight: 50,
  },
  applyBtn: {
    flex: 1.3,
    minHeight: 50,
  },
  sortRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  sortRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.divider,
  },
  sortLabel: {
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  sortLabelActive: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
});
