import { Palette, Radius, Typography } from '@/constants/theme';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Action = { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' };

type Props = {
  visible: boolean;
  title: string;
  body?: string;
  /** Danger tone tints the title (e.g. delete account). */
  tone?: 'default' | 'danger';
  actions: Action[];
  onClose: () => void;
};

export function Dialog({ visible, title, body, tone = 'default', actions, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, tone === 'danger' ? styles.titleDanger : null]}>{title}</Text>
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
    maxWidth: 340,
    backgroundColor: Palette.ivoryElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: Typography.display,
    color: Palette.espresso,
  },
  titleDanger: {
    color: Palette.errorText,
  },
  body: {
    fontSize: 12,
    fontFamily: Typography.body,
    color: Palette.body,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 9,
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
    borderColor: Palette.plum,
    backgroundColor: Palette.ivoryElevated,
  },
  btnDanger: {
    backgroundColor: Palette.errorText,
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
    color: Palette.plum,
  },
  btnLabelDanger: {
    color: Palette.ivory,
  },
});
