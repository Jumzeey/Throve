import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { size?: number; color: string };

export function HomeIcon({ size = 19, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M3 11l9-8 9 8" />
      <Path d="M5 10v10h14V10" />
    </Svg>
  );
}

export function LiveIcon({ size = 19, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Rect x={2} y={6} width={14} height={12} rx={2} />
      <Path d="M16 10l6-4v12l-6-4" />
    </Svg>
  );
}

export function SellIcon({ size = 19, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function InboxIcon({ size = 19, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Rect x={3} y={4} width={18} height={16} rx={2} />
      <Path d="M3 9h18" />
    </Svg>
  );
}

export function ProfileIcon({ size = 19, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx={12} cy={8} r={3.4} />
      <Path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
    </Svg>
  );
}
