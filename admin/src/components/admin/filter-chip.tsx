import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size="sm"
      onClick={onClick}
      className={cn(
        'h-auto rounded border px-2.5 py-1.5 text-[11px]',
        active ? 'border-plum bg-plum-soft font-semibold text-plum hover:bg-plum-soft' : 'border-border bg-card text-body',
      )}
    >
      {label}
    </Button>
  );
}
