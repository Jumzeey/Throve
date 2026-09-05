import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Palette } from '@/constants/theme';

type IconProps = { size?: number; color?: string; strokeWidth?: number };

export function ChevronBackIcon({ size = 19, color = Palette.espresso, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 16, color = Palette.muted, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function ChevronForwardIcon({ size = 15, color = Palette.muted3, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m9 5 7 7-7 7" />
    </Svg>
  );
}

export function ListingsIcon({ size = 18, color = Palette.plum, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Rect x={3.5} y={4} width={17} height={16} rx={2.5} />
      <Path d="M8 9h8M8 13h5" />
    </Svg>
  );
}

export function BagIcon({ size = 18, color = Palette.plum, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Path d="M4 8h16l-1.4 11H5.4z" />
      <Path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

export function MoreVerticalIcon({ size = 18, color = Palette.muted, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={12} cy={5} r={1.8} />
      <Circle cx={12} cy={12} r={1.8} />
      <Circle cx={12} cy={19} r={1.8} />
    </Svg>
  );
}

export function PlusIcon({ size = 18, color = Palette.plum, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color = Palette.espresso, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function BellIcon({ size = 21, color = Palette.espresso, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <Path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </Svg>
  );
}

export function HeartIcon({
  size = 15,
  color = Palette.espresso,
  strokeWidth = 1.7,
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.4l8.8-8.7a5 5 0 0 0 0-7.1z" />
    </Svg>
  );
}

export function MailIcon({ size = 26, color = Palette.plum, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={2.5} />
      <Path d="m3.6 6.5 8.4 6 8.4-6" />
    </Svg>
  );
}

export function CheckIcon({ size = 17, color = Palette.successText, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="m5 13 4 4L19 7" />
    </Svg>
  );
}

export function InfoCircleIcon({ size = 18, color = Palette.plum, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5.5" />
      <Path d="M12 7.6h.01" />
    </Svg>
  );
}

export function AlertCircleIcon({ size = 17, color = Palette.error, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 8v5" />
      <Path d="M12 16.5h.01" />
    </Svg>
  );
}

export function WifiOffIcon({ size = 17, color = Palette.warning, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M12 20h.01" />
      <Path d="M4.5 12.5a10 10 0 0 1 15 0" />
      <Path d="M8 16a5.5 5.5 0 0 1 8 0" />
      <Path d="M2 6 22 20" />
    </Svg>
  );
}

export function ClockIcon({ size = 17, color = Palette.warningText, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 7.5v5l3 2" />
    </Svg>
  );
}

export function PinIcon({ size = 13, color = Palette.plum, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M12 17v5" />
      <Path d="M9 2h6l-1 8 4 3v2H6v-2l4-3z" />
    </Svg>
  );
}

export function MapPinIcon({ size = 14, color = Palette.muted, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 21s7-6.2 7-11.2A7 7 0 1 0 5 9.8C5 14.8 12 21 12 21z" />
      <Circle cx={12} cy={9.8} r={2.2} />
    </Svg>
  );
}

export function SendIcon({ size = 18, color = Palette.ivory, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Path d="M21 3 10.5 13.5" />
      <Path d="M21 3 14 21l-3.5-7.5L3 10z" />
    </Svg>
  );
}

export function SettingsIcon({ size = 18, color = Palette.espresso, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.5 12a7.5 7.5 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-2-1.2L14.7 3H9.3l-.4 2.7c-.7.3-1.4.7-2 1.2l-2.3-1-2 3.4 2 1.5a7.5 7.5 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1c.6.5 1.3.9 2 1.2l.4 2.7h5.4l.4-2.7c.7-.3 1.4-.7 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z" />
    </Svg>
  );
}

export function CloseIcon({ size = 16, color = Palette.ivory, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function MoreHorizontalIcon({ size = 16, color = Palette.ivory }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx={5} cy={12} r={1.8} />
      <Circle cx={12} cy={12} r={1.8} />
      <Circle cx={19} cy={12} r={1.8} />
    </Svg>
  );
}

export function TicketIcon({ size = 16, color = Palette.plum, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Path d="M4 7.5h16v9H4z" />
      <Path d="M9 12h6" />
    </Svg>
  );
}

export function ProhibitedIcon({ size = 22, color = Palette.muted, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={12} cy={12} r={9} />
      <Path d="M6 6l12 12" />
    </Svg>
  );
}

export function UserIcon({ size = 17, color = Palette.muted3, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Circle cx={12} cy={8.5} r={3.4} />
      <Path d="M5.2 19.5c.7-3.4 3.5-5.1 6.8-5.1s6.1 1.7 6.8 5.1" />
    </Svg>
  );
}

export function SpinnerArcIcon({ size = 16, color = Palette.ivory, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M12 3a9 9 0 1 0 9 9" />
    </Svg>
  );
}

export function StarIcon({ size = 14, color = Palette.gold }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="m12 3.6 2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z" />
    </Svg>
  );
}

export function ImagePlaceholderIcon({ size = 18, color = Palette.placeholder, strokeWidth = 1.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Rect x={3} y={5} width={18} height={14} rx={2} />
      <Circle cx={8.5} cy={10} r={1.6} />
      <Path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
    </Svg>
  );
}

export function EyeIcon({ size = 12, color = Palette.ivory, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
      <Circle cx={12} cy={12} r={2.6} />
    </Svg>
  );
}

export function ShieldIcon({ size = 16, color = Palette.ivory, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
    </Svg>
  );
}

export function LockIcon({ size = 16, color = Palette.plum, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M7 11V8a5 5 0 0 1 10 0v3" />
      <Path d="M6.5 11h11a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-7A1.5 1.5 0 0 1 6.5 11z" />
    </Svg>
  );
}

export function ShieldCheckIcon({ size = 15, color = Palette.success, strokeWidth = 1.6 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6z" />
      <Path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

export function ShareIcon({ size = 18, color = Palette.espresso, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M12 15V4" />
      <Path d="m8 8 4-4 4 4" />
      <Path d="M5 13v6h14v-6" />
    </Svg>
  );
}

export function ChatBubbleIcon({ size = 16, color = Palette.espresso, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Path d="M3.5 6.5h17v11h-11l-6 3.5z" />
    </Svg>
  );
}

export function VideoIcon({ size = 26, color = Palette.blush, strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round">
      <Rect x={2.5} y={6} width={14} height={12} rx={2.5} />
      <Path d="M16.5 10.5 21.5 8v8l-5-2.5z" />
    </Svg>
  );
}

export function CalendarIcon({ size = 17, color = Palette.muted, strokeWidth = 1.7 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Rect x={3.5} y={5} width={17} height={15} rx={2.5} />
      <Path d="M3.5 10h17M8 3v3.5M16 3v3.5" />
    </Svg>
  );
}

export function FilterSlidersIcon({ size = 13, color = Palette.ivory, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M4 7h16M7 12h10M10 17h4" />
    </Svg>
  );
}

export function SortArrowsIcon({ size = 13, color = Palette.body, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round">
      <Path d="M7 4v16M7 20l-3-3M17 20V4M17 4l3 3" />
    </Svg>
  );
}
