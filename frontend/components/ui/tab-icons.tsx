import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = { size?: number; color: string };

/** Glyphs are drawn centred on (12, 12) and span roughly 3.5–20.5 so tabs line up optically. */
function TabSvg({ size = 21, color, children }: Props & { children: ReactNode }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

export function HomeIcon(props: Props) {
  return (
    <TabSvg {...props}>
      <Path d="M3.5 10.5 12 3.5l8.5 7" />
      <Path d="M5.5 9v11.5h13V9" />
    </TabSvg>
  );
}

export function LiveIcon(props: Props) {
  return (
    <TabSvg {...props}>
      <Rect x={2.5} y={5.5} width={14} height={13} rx={2.5} />
      <Path d="M16.5 10 21.5 7.5v9l-5-2.5z" />
    </TabSvg>
  );
}

export function SellIcon(props: Props) {
  return (
    <TabSvg {...props}>
      <Rect x={3.5} y={3.5} width={17} height={17} rx={4} />
      <Path d="M12 8.5v7M8.5 12h7" />
    </TabSvg>
  );
}

export function InboxIcon(props: Props) {
  return (
    <TabSvg {...props}>
      <Path d="M3.5 4.5h17v12H10l-6.5 3.5z" />
    </TabSvg>
  );
}

export function ProfileIcon(props: Props) {
  return (
    <TabSvg {...props}>
      <Circle cx={12} cy={7.6} r={3.6} />
      <Path d="M4.8 20c.6-3.7 3.6-5.6 7.2-5.6s6.6 1.9 7.2 5.6" />
    </TabSvg>
  );
}
