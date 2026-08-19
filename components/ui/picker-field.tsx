import { Palette, Radius, Typography } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  value: string;
  options: string[];
  placeholder?: string;
  onSelect: (value: string) => void;
};

export function PickerField({ value, options, placeholder, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)}>
        <Text style={[styles.fieldText, !value && styles.placeholder]}>{value || placeholder || 'Select'}</Text>
        <Ionicons name="chevron-down" size={16} color={Palette.muted2} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => { setOpen(false); setSearch(''); }}>
        <Pressable style={styles.overlay} onPress={() => { setOpen(false); setSearch(''); }}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} />
            <TextInput
              style={styles.search}
              placeholder="Search…"
              placeholderTextColor={Palette.muted3}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item === value && styles.optionActive]}
                  onPress={() => { onSelect(item); setOpen(false); setSearch(''); }}>
                  <Text style={[styles.optionText, item === value && styles.optionTextActive]}>{item}</Text>
                  {item === value && <Ionicons name="checkmark" size={18} color={Palette.accent700} />}
                </Pressable>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No results</Text>}
            />
            <Pressable style={styles.cancel} onPress={() => { setOpen(false); setSearch(''); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
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
    backgroundColor: Palette.background,
  },
  fieldText: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.text,
  },
  placeholder: {
    color: Palette.muted3,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(23,23,23,0.3)',
  },
  sheet: {
    backgroundColor: Palette.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '70%',
    paddingBottom: 34,
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
    height: 42,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.text,
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
    backgroundColor: Palette.accent100,
  },
  optionText: {
    fontSize: 15,
    fontFamily: Typography.body,
    color: Palette.text,
  },
  optionTextActive: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.accent700,
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
    marginTop: 10,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
  },
});
