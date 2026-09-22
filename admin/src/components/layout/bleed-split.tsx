import type { ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useLgUp } from '@/hooks/use-bleed-selection';
import { cn } from '@/lib/utils';

/**
 * Desktop: side-by-side list | inspector (caller grid).
 * Below lg: list full-width; inspector in a right Sheet when open.
 */
export function BleedSplit({
  list,
  inspector,
  open,
  onOpenChange,
  gridClassName = 'grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)]',
  inspectorTitle = 'Details',
  className,
}: {
  list: ReactNode;
  inspector: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gridClassName?: string;
  inspectorTitle?: string;
  className?: string;
}) {
  const lgUp = useLgUp();
  const sheetOpen = open && !lgUp;

  return (
    <>
      <div className={cn('grid h-full min-h-0', gridClassName, className)}>
        <div className="flex min-h-0 min-w-0 flex-col border-[#dccfc4] bg-panel lg:border-r">
          {list}
        </div>
        <aside className="hidden min-h-0 flex-col bg-panel lg:flex">{inspector}</aside>
      </div>

      <Sheet open={sheetOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          showCloseButton
          className="flex w-full max-w-full flex-col gap-0 border-l border-[#dccfc4] bg-panel p-0 sm:max-w-[420px] [&>button]:top-3.5 [&>button]:right-3.5 [&>button]:z-10"
        >
          <SheetTitle className="sr-only">{inspectorTitle}</SheetTitle>
          {/* pt clears absolute Sheet close so badges/IDs never sit under the X */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-11">{inspector}</div>
        </SheetContent>
      </Sheet>
    </>
  );
}
