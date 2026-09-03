import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  meta,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  meta?: string;
  accent?: 'plum' | 'gold' | 'hold' | 'risk' | 'clear' | 'none';
}) {
  const top =
    accent === 'plum'
      ? 'border-t-2 border-t-plum'
      : accent === 'gold'
        ? 'border-t-2 border-t-gold'
        : accent === 'hold'
          ? 'border-t-2 border-t-hold'
          : accent === 'risk'
            ? 'border-t-2 border-t-risk'
            : accent === 'clear'
              ? 'border-t-2 border-t-clear'
              : '';

  return (
    <Card className={cn('rounded-[6px] border border-border-soft bg-panel shadow-none', top)}>
      <CardContent className="px-[18px] py-4">
        <div className="text-[10px] font-semibold tracking-[0.14em] text-muted-2 uppercase">{label}</div>
        <div className="mt-2 flex items-end gap-2">
          <div className="font-display text-[36px] leading-none tabular-nums text-espresso">{value}</div>
          {meta ? (
            <div className={cn('pb-1 text-[11px]', accent === 'risk' ? 'text-risk' : 'text-muted')}>{meta}</div>
          ) : null}
        </div>
        {hint ? <div className="mt-2 text-[11px] text-muted">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}
