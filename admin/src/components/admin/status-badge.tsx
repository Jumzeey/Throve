import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusTone = 'neutral' | 'plum' | 'gold' | 'clear' | 'hold' | 'risk';

/** Hi-Fi pill colors from Operations dashboard spec. */
const toneClass: Record<StatusTone, string> = {
  neutral: 'rounded-[3px] border-[#e2d7cc] bg-[#f3ede6] text-body',
  plum: 'rounded-[3px] border-plum-border bg-plum-soft text-plum',
  gold: 'rounded-[3px] border-hold-border bg-hold-bg text-hold',
  clear: 'rounded-[3px] border-clear-border bg-clear-bg text-clear',
  hold: 'rounded-[3px] border-hold-border bg-hold-bg text-hold',
  risk: 'rounded-[3px] border-risk-border bg-risk-bg text-risk',
};

export function StatusBadge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn('h-auto rounded-[3px] px-[7px] py-[3px] text-[10.5px] font-semibold tabular-nums', toneClass[tone], className)}
    >
      {children}
    </Badge>
  );
}
