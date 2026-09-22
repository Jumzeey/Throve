import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/** ID + copy button for inspector headers (desktop and mobile Sheet). */
export function CopyableId({
  value,
  variant = 'mono',
  className,
}: {
  value: string;
  /** mono = small secondary id; display = large primary id */
  variant?: 'mono' | 'display';
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-1.5', className)}>
      <span
        className={cn(
          'min-w-0 truncate',
          variant === 'display'
            ? 'font-display text-[26px] leading-none text-espresso'
            : 'font-mono text-[11px] font-semibold text-muted',
        )}
        title={value}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void copy();
        }}
        aria-label={copied ? 'Copied' : 'Copy ID'}
        title={copied ? 'Copied' : 'Copy ID'}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-[4px] border border-[#e2d7cc] text-body transition hover:bg-[#fbf5ef] hover:text-espresso',
          variant === 'display' ? 'size-8' : 'size-7',
        )}
      >
        {copied ? (
          <Check className={cn(variant === 'display' ? 'size-3.5' : 'size-3', 'text-clear')} />
        ) : (
          <Copy className={cn(variant === 'display' ? 'size-3.5' : 'size-3')} strokeWidth={1.8} />
        )}
      </button>
    </div>
  );
}
