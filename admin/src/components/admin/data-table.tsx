import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export function DataTable({
  headers,
  children,
  className,
}: {
  headers: (string | { label: string; align?: 'left' | 'right' })[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-[5px] border border-border-soft bg-card', className)}>
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow className="border-divider bg-panel-elevated hover:bg-panel-elevated">
            {headers.map((h, i) => {
              const label = typeof h === 'string' ? h : h.label;
              const align = typeof h === 'string' ? 'left' : (h.align ?? 'left');
              return (
                <TableHead
                  key={`${label}-${i}`}
                  className={cn(
                    'h-auto px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-2',
                    align === 'right' && 'text-right',
                  )}
                >
                  {label}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function Tr({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <TableRow
      onClick={onClick}
      data-state={active ? 'selected' : undefined}
      className={cn(
        'border-divider',
        onClick && 'cursor-pointer',
        active && 'bg-plum-soft/40 data-[state=selected]:bg-plum-soft/40',
      )}
    >
      {children}
    </TableRow>
  );
}

export function Td({
  children,
  align = 'left',
  className,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <TableCell className={cn('px-3 py-2.5 text-[12px] text-body whitespace-normal', align === 'right' && 'text-right', className)}>
      {children}
    </TableCell>
  );
}
