import { Palette } from '@/constants/theme';
import { Pressable, StyleSheet, View } from 'react-native';

type Props = {
  on: boolean;
  onToggle: () => void;
};

export function ReadyToggle({ on, onToggle }: Props) {
  return (
    <Pressable onPress={onToggle} style={[styles.track, on ? styles.trackOn : styles.trackOff]} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 2,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: Palette.plum,
  },
  trackOff: {
    backgroundColor: Palette.border,
  },
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Palette.ivory,
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  knobOff: {
    alignSelf: 'flex-start',
  },
});
