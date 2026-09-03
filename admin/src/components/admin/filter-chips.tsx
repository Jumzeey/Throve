import { cn } from '@/lib/utils';

export function FilterChips({
  options,
  value,
  onChange,
  className,
  /** solid = espresso (default); soft = plum tint (Users Hi-Fi) */
  tone = 'solid',
}: {
  options: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  tone?: 'solid' | 'soft';
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-[4px] border px-[11px] py-1.5 text-[11px] transition',
              active
                ? tone === 'soft'
                  ? 'border-[#dfc9d7] bg-[#f4ecf1] font-semibold text-plum'
                  : 'border-espresso bg-espresso text-panel'
                : 'border-border-soft bg-transparent text-body hover:border-espresso/30',
            )}
          >
            {opt.label}
            {typeof opt.count === 'number' ? (
              <span className={cn('tabular-nums', active ? (tone === 'soft' ? 'text-plum' : 'text-gold') : 'text-muted-2')}>
                {opt.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
