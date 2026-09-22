import { ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ListWindowState } from '@/hooks/use-list-window';
import { cn } from '@/lib/utils';

type FooterProps = Pick<
  ListWindowState<unknown>,
  | 'paginated'
  | 'page'
  | 'setPage'
  | 'totalPages'
  | 'total'
  | 'showingFrom'
  | 'showingTo'
  | 'hasMore'
  | 'scrollToTop'
  | 'sentinelRef'
> & {
  className?: string;
};

/** Renders under table rows: md+ page controls; mobile sentinel + Back to top. */
export function ListWindowFooter({
  paginated,
  page,
  setPage,
  totalPages,
  total,
  showingFrom,
  showingTo,
  hasMore,
  scrollToTop,
  sentinelRef,
  className,
}: FooterProps) {
  if (total === 0) return null;

  if (paginated) {
    return (
      <div
        className={cn(
          'sticky bottom-0 z-[1] flex flex-wrap items-center justify-between gap-2 border-t border-[#e7dcd2] bg-[#fbf5ef] px-4 py-2.5',
          className,
        )}
      >
        <span className="text-[11px] tabular-nums text-body">
          {showingFrom}–{showingTo} of {total}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5 text-[11.5px]"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>
          <span className="min-w-[4.5rem] text-center text-[11px] tabular-nums text-muted">
            Page {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2.5 text-[11.5px]"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border-t border-[#e7dcd2] bg-panel', className)}>
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
      {hasMore ? (
        <p className="px-4 py-2 text-center text-[11px] text-muted">Loading more…</p>
      ) : (
        <p className="px-4 py-2 text-center text-[11px] tabular-nums text-muted">
          {showingTo} of {total}
        </p>
      )}
      <div className="px-4 pb-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full gap-1.5 text-[12px]"
          onClick={scrollToTop}
        >
          <ChevronUp className="size-3.5" />
          Back to top
        </Button>
      </div>
    </div>
  );
}
