import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { size?: number; color: string };

export function HomeIcon({ size = 21, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round">
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5.5 9.5V20h13V9.5" />
    </Svg>
  );
}

export function LiveIcon({ size = 21, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round">
      <Rect x={2.5} y={6} width={14} height={12} rx={2.5} />
      <Path d="M16.5 10.5 21.5 8v8l-5-2.5z" />
    </Svg>
  );
}

export function SellIcon({ size = 21, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round">
      <Rect x={3.5} y={3.5} width={17} height={17} rx={4} />
      <Path d="M12 8.5v7M8.5 12h7" />
    </Svg>
  );
}

export function InboxIcon({ size = 21, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round">
      <Path d="M3.5 6.5h17v11h-11l-6 3.5z" />
    </Svg>
  );
}

export function ProfileIcon({ size = 21, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round">
      <Circle cx={12} cy={8} r={3.6} />
      <Path d="M4.8 20c.6-3.7 3.6-5.6 7.2-5.6s6.6 1.9 7.2 5.6" />
    </Svg>
  );
}
