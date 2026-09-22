import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ExpandableDetail = {
  label: string;
  value: ReactNode;
};

/**
 * Dense list row: full multi-column grid on lg+; below lg a compact primary
 * strip + chevron that expands stacked key/value fields (no horizontal scroll).
 * Chevron click does not select the row (stopPropagation).
 */
export function ExpandableListRow({
  selected,
  onSelect,
  primary,
  details,
  children,
  desktopClassName,
  className,
}: {
  selected?: boolean;
  onSelect?: () => void;
  primary: ReactNode;
  details: ExpandableDetail[];
  children: ReactNode;
  desktopClassName: string;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        'border-b border-[#f0e7de] last:border-0',
        selected ? 'bg-[#f9f1ea]' : 'bg-panel',
        className,
      )}
    >
      {/* Desktop full grid */}
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'hidden w-full items-start gap-x-3 px-4 py-4 text-left lg:grid',
          desktopClassName,
          !selected && 'hover:bg-[#fbf5ef]',
        )}
      >
        {children}
      </button>

      {/* Mobile compact + expand */}
      <div className="lg:hidden">
        <div className="flex items-start gap-2 px-4 py-3">
          <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
            {primary}
          </button>
          {details.length > 0 ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-label={expanded ? 'Hide details' : 'Show details'}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[4px] border border-[#e2d7cc] text-body"
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          ) : null}
        </div>
        {expanded && details.length > 0 ? (
          <div className="space-y-2 border-t border-[#f0e7de] bg-[#fbf7f2] px-4 py-3">
            {details.map((d) => (
              <div key={d.label} className="flex items-start justify-between gap-3 text-[11.5px]">
                <span className="shrink-0 font-semibold tracking-[0.06em] text-muted-2 uppercase">
                  {d.label}
                </span>
                <span className="min-w-0 text-right text-espresso">{d.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Sticky column header: full labels on lg+, compact label below. */
export function ExpandableListHeader({
  columns,
  desktopClassName,
  compactLabel = 'Results',
}: {
  columns: ReactNode;
  desktopClassName: string;
  compactLabel?: string;
}) {
  return (
    <div className="sticky top-0 z-[1] border-b border-[#e7dcd2] bg-[#fbf5ef]">
      <div
        className={cn(
          'hidden gap-x-3 px-4 py-3 text-[9.5px] font-semibold tracking-[0.13em] text-muted-2 uppercase lg:grid',
          desktopClassName,
        )}
      >
        {columns}
      </div>
      <div className="px-4 py-2.5 text-[9.5px] font-semibold tracking-[0.13em] text-muted-2 uppercase lg:hidden">
        {compactLabel}
      </div>
    </div>
  );
}
