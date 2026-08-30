import { Palette, Radius, Typography } from '@/constants/theme';
import { formatDob, parseDob } from '@/lib/validation';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  maximumDate?: Date;
  minimumDate?: Date;
};

const MIN_DOB = new Date(1900, 0, 1);
const MAX_DOB = new Date();

function defaultPickerDate() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 18);
  return date;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'DD / MM / YYYY',
  error,
  maximumDate = MAX_DOB,
  minimumDate = MIN_DOB,
}: Props) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseDob(value) ?? defaultPickerDate());

  const hasError = Boolean(error);

  function open() {
    setDraft(parseDob(value) ?? defaultPickerDate());
    setShow(true);
    setFocused(true);
  }

  function close() {
    setShow(false);
    setFocused(false);
  }

  function confirm() {
    onChange(formatDob(draft));
    close();
  }

  function onPickerChange(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      close();
      if (event.type === 'set' && selected) {
        onChange(formatDob(selected));
      }
      return;
    }
    if (selected) setDraft(selected);
  }

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={open}
        style={[styles.input, focused && !hasError ? styles.focused : null, hasError ? styles.errorInput : null]}
      >
        <Text style={[styles.inputText, !value && styles.placeholder]}>{value || placeholder}</Text>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {Platform.OS === 'ios' ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={close}>
          <Pressable style={styles.overlay} onPress={close} />
          <View style={styles.sheet}>
            <View style={styles.toolbar}>
              <Pressable onPress={close} hitSlop={8}>
                <Text style={styles.toolbarAction}>Cancel</Text>
              </Pressable>
              <Pressable onPress={confirm} hitSlop={8}>
                <Text style={[styles.toolbarAction, styles.toolbarDone]}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              onChange={onPickerChange}
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              themeVariant="light"
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      ) : show ? (
        <DateTimePicker
          value={parseDob(value) ?? defaultPickerDate()}
          mode="date"
          display="calendar"
          onChange={onPickerChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: {
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    fontFamily: Typography.bodySemiBold,
    color: Palette.label,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: 15,
    justifyContent: 'center',
    backgroundColor: Palette.ivoryElevated,
  },
  inputText: {
    fontSize: 14.5,
    fontFamily: Typography.body,
    color: Palette.espresso,
  },
  placeholder: {
    color: Palette.disabled,
  },
  focused: {
    borderWidth: 1.5,
    borderColor: Palette.plum,
    shadowColor: Palette.plum,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.09,
    shadowRadius: 3,
  },
  errorInput: {
    borderWidth: 1.5,
    borderColor: Palette.error,
  },
  errorText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: Palette.error,
    fontFamily: Typography.body,
  },
  overlay: {
    flex: 1,
    backgroundColor: Palette.liveOverlay,
  },
  sheet: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    paddingBottom: 24,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.divider,
  },
  toolbarAction: {
    fontSize: 16,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  toolbarDone: {
    fontFamily: Typography.bodySemiBold,
    color: Palette.plum,
  },
  iosPicker: {
    alignSelf: 'center',
  },
});
