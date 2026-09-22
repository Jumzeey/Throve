import { cn } from '@/lib/utils';

type BrandMarkProps = {
  /** Wordmark text color: cream on dark panes, plum on light. */
  variant?: 'onDark' | 'onLight';
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
};

const sizeClass = {
  sm: 'size-8',
  md: 'size-11',
  lg: 'size-14',
} as const;

/**
 * Official Throve mark from /public/throve-logo.png (cream ground + plum T).
 */
export function BrandMark({
  variant = 'onLight',
  size = 'md',
  showWordmark = false,
  className,
}: BrandMarkProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <img
        src="/throve-logo.png"
        alt="Throve"
        className={cn(
          sizeClass[size],
          'shrink-0 rounded-[4px] object-contain bg-[#FFF7F0]',
        )}
      />
      {showWordmark ? (
        <span
          className={cn(
            'font-display leading-none',
            size === 'lg' ? 'text-[28px]' : size === 'md' ? 'text-[23px]' : 'text-[18px]',
            variant === 'onDark' ? 'text-panel' : 'text-plum',
          )}
        >
          throve
        </span>
      ) : null}
    </div>
  );
}
