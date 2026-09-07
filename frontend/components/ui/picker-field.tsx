import { Button } from '@/components/ui/button';
import { CheckIcon, ChevronDownIcon } from '@/components/ui/icons';
import { KeyboardSafeSheet } from '@/components/ui/keyboard-safe';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Shadows, Typography } from '@/constants/theme';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import { useMemo, useState } from 'react';
import { Dimensions, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  value: string;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** When true, typed search can be used as a custom value (not limited to options). */
  allowCustom?: boolean;
  customActionLabel?: (query: string) => string;
  customEyebrow?: string;
  onSelect: (value: string) => void;
  error?: string | null;
};

export function PickerField({
  value,
  options,
  placeholder,
  searchPlaceholder = 'Search…',
  allowCustom = false,
  customActionLabel,
  customEyebrow = 'Use your brand',
  onSelect,
  error,
}: Props) {
  const keyboard = useKeyboardInset();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const trimmedSearch = search.trim();
  const filtered = useMemo(() => {
    if (!trimmedSearch) return options;
    const needle = trimmedSearch.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(needle));
  }, [options, trimmedSearch]);

  const exactMatch = useMemo(
    () => options.some((o) => o.toLowerCase() === trimmedSearch.toLowerCase()),
    [options, trimmedSearch],
  );

  const showCustom = allowCustom && trimmedSearch.length > 0 && !exactMatch;

  const windowHeight = Dimensions.get('window').height;
  const sheetMaxHeight =
    keyboard.height > 0
      ? Math.max(280, windowHeight - keyboard.height - 28)
      : Math.round(windowHeight * 0.7);

  function close() {
    setOpen(false);
    setSearch('');
  }

  function choose(next: string) {
    onSelect(next.trim());
    close();
  }

  return (
    <>
      <Pressable style={[styles.field, error ? styles.fieldError : null]} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldText, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder || 'Select'}
        </Text>
        <ChevronDownIcon />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <KeyboardSafeSheet onDismiss={close} style={[styles.sheet, { maxHeight: sheetMaxHeight }]}>
          <View style={styles.handle} />
          <TextField
            placeholder={allowCustom ? 'Search or type your own…' : searchPlaceholder}
            value={search}
            onChangeText={setSearch}
            autoFocus
            autoCapitalize={allowCustom ? 'words' : 'none'}
            returnKeyType={allowCustom ? 'done' : 'search'}
            onSubmitEditing={() => {
              if (showCustom) choose(trimmedSearch);
              else if (filtered.length === 1) choose(filtered[0]);
            }}
            style={styles.search}
          />
          {allowCustom ? (
            <Text style={styles.customHint}>Suggestions below — or type any value of your own.</Text>
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={styles.list}
            ListHeaderComponent={
              showCustom ? (
                <Pressable style={[styles.option, styles.customOption]} onPress={() => choose(trimmedSearch)}>
                  <View style={styles.customCopy}>
                    <Text style={styles.customEyebrow}>{customEyebrow}</Text>
                    <Text style={styles.customValue} numberOfLines={2}>
                      {customActionLabel?.(trimmedSearch) ?? trimmedSearch}
                    </Text>
                  </View>
                  <CheckIcon size={18} color={Palette.plum} />
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.option, item === value && styles.optionActive]}
                onPress={() => choose(item)}>
                <Text style={[styles.optionText, item === value && styles.optionTextActive]}>{item}</Text>
                {item === value ? <CheckIcon size={18} color={Palette.plum} /> : null}
              </Pressable>
            )}
            ListEmptyComponent={
              showCustom ? null : (
                <Text style={styles.empty}>
                  {allowCustom ? 'Type above to use your own value.' : 'No results'}
                </Text>
              )
            }
          />
          <Button label="Cancel" variant="ghost" onPress={close} style={styles.cancel} />
        </KeyboardSafeSheet>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: Palette.ivoryElevated,
  },
  fieldText: {
    flex: 1,
    marginRight: 8,
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  placeholder: {
    color: Palette.placeholder,
  },
  fieldError: {
    borderColor: Palette.error,
    borderWidth: 1.5,
  },
  errorText: {
    marginTop: 6,
    fontSize: 11.5,
    lineHeight: 18,
    color: Palette.error,
    fontFamily: Typography.body,
  },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    ...Shadows.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  search: {
    marginHorizontal: 18,
    marginBottom: 6,
  },
  customHint: {
    marginHorizontal: 18,
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.muted,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.divider,
  },
  customOption: {
    backgroundColor: '#F8ECEF',
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  customCopy: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  customEyebrow: {
    fontSize: 10.5,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  customValue: {
    fontSize: 15,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
  },
  optionActive: {
    backgroundColor: Palette.ivoryElevated,
  },
  optionText: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  optionTextActive: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.muted3,
  },
  cancel: {
    marginHorizontal: 18,
    marginTop: 6,
  },
});
