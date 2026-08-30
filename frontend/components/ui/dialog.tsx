import { Palette, Radius, Typography } from '@/constants/theme';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Action = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' };

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  actions: Action[];
  onClose: () => void;
};

export function Dialog({ visible, title, body, actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                style={[styles.btn, action.variant === 'danger' && styles.btnDanger, action.variant === 'primary' && styles.btnPrimary]}
                onPress={action.onPress}>
                <Text
                  style={[
                    styles.btnLabel,
                    action.variant === 'primary' && styles.btnLabelPrimary,
                    action.variant === 'danger' && styles.btnLabelDanger,
                  ]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(23,23,23,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 290,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: Typography.heading,
    color: Palette.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontFamily: Typography.body,
    color: Palette.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    borderColor: Palette.accent700,
  },
  btnDanger: {
    borderColor: Palette.live,
  },
  btnLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.text,
    textAlign: 'center',
  },
  btnLabelPrimary: {
    color: Palette.accent800,
  },
  btnLabelDanger: {
    color: Palette.live,
  },
});
