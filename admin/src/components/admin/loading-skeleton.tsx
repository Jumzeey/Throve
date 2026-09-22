import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Dense list/table placeholder — use instead of spinners for queue loads. */
export function ListSkeleton({
  rows = 8,
  withAvatar = false,
  className,
}: {
  rows?: number;
  withAvatar?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('bg-panel', className)}>
      <div className="sticky top-0 z-[1] border-b border-[#e7dcd2] bg-[#fbf5ef] px-4 py-3">
        <div className="hidden gap-3 lg:flex">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-2.5 w-16 lg:hidden" />
      </div>
      <div className="divide-y divide-[#f0e7de]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-4">
            {withAvatar ? <Skeleton className="size-[30px] shrink-0 rounded-full" /> : null}
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-[28%]" />
              <Skeleton className="h-2.5 w-[55%]" />
              <Skeleton className="h-2.5 w-[40%] lg:hidden" />
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-2 lg:flex">
              <Skeleton className="h-5 w-16 rounded-[3px]" />
              <Skeleton className="h-2.5 w-12" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Inspector / detail pane placeholder. */
export function DetailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col bg-panel', className)}>
      <div className="space-y-3 border-b border-[#e7dcd2] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-[42%]" />
            <Skeleton className="h-3 w-[70%]" />
            <Skeleton className="h-2.5 w-[48%]" />
          </div>
          <Skeleton className="h-5 w-20 shrink-0 rounded-[3px]" />
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto px-5 py-4">
        <Skeleton className="h-[72px] w-full rounded-[8px]" />
        <div className="space-y-2 rounded-[8px] border border-[#ebe3da] p-3">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[88%]" />
          <Skeleton className="h-3 w-[64%]" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-[6px]" />
          <Skeleton className="h-16 rounded-[6px]" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-28" />
          <Skeleton className="h-10 w-full rounded-[5px]" />
          <Skeleton className="h-10 w-full rounded-[5px]" />
        </div>
      </div>
    </div>
  );
}

/** Generic block skeleton for non-table surfaces (cards, ops panels). */
export function PanelSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-[6px]" />
      ))}
    </div>
  );
}
