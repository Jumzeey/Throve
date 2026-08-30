import { Button } from '@/components/ui/button';
import { CheckIcon, ChevronDownIcon } from '@/components/ui/icons';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius, Shadows, Typography } from '@/constants/theme';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  value: string;
  options: string[];
  placeholder?: string;
  onSelect: (value: string) => void;
};

export function PickerField({ value, options, placeholder, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase())) : options;

  function close() {
    setOpen(false);
    setSearch('');
  }

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>{value || placeholder || 'Select'}</Text>
        <ChevronDownIcon />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <TextField
              placeholder="Search…"
              value={search}
              onChangeText={setSearch}
              autoFocus
              style={styles.search}
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable style={[styles.option, item === value && styles.optionActive]} onPress={() => { onSelect(item); close(); }}>
                  <Text style={[styles.optionText, item === value && styles.optionTextActive]}>{item}</Text>
                  {item === value ? <CheckIcon size={18} color={Palette.plum} /> : null}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No results</Text>}
            />
            <Button label="Cancel" variant="ghost" onPress={close} style={styles.cancel} />
          </View>
        </Pressable>
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
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  placeholder: {
    color: Palette.placeholder,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Palette.liveOverlay,
  },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '70%',
    paddingBottom: 34,
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.divider,
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
