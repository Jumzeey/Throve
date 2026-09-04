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
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.actions}>
            {actions.map((action) => {
              const variant = action.variant ?? (actions.length === 1 ? 'primary' : 'secondary');
              return (
                <Pressable
                  key={action.label}
                  style={[
                    styles.btn,
                    variant === 'primary' && styles.btnPrimary,
                    variant === 'danger' && styles.btnDanger,
                    variant === 'secondary' && styles.btnSecondary,
                  ]}
                  onPress={action.onPress}
                >
                  <Text
                    style={[
                      styles.btnLabel,
                      variant === 'primary' && styles.btnLabelPrimary,
                      variant === 'danger' && styles.btnLabelDanger,
                      variant === 'secondary' && styles.btnLabelSecondary,
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(43,33,31,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 10,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: Typography.display,
    color: Palette.espresso,
    textAlign: 'center',
  },
  body: {
    fontSize: 13.5,
    fontFamily: Typography.body,
    color: Palette.body,
    textAlign: 'center',
    lineHeight: 21,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: Palette.plum,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.ivory,
  },
  btnDanger: {
    backgroundColor: Palette.errorBg,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
  },
  btnLabel: {
    fontSize: 13.5,
    fontFamily: Typography.bodySemiBold,
    textAlign: 'center',
  },
  btnLabelPrimary: {
    color: Palette.ivory,
  },
  btnLabelSecondary: {
    color: Palette.espresso,
  },
  btnLabelDanger: {
    color: Palette.errorText,
  },
});
