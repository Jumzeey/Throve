import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ListSkeleton } from '@/components/admin/loading-skeleton';
import { Inbox, WifiOff } from 'lucide-react';

export function EmptyState({
  title = 'Nothing here',
  description = 'No records match the current filters.',
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <Inbox className="size-8 text-muted-2" strokeWidth={1.25} />
      <div className="font-display text-lg text-espresso">{title}</div>
      <p className="max-w-sm text-[12.5px] text-muted">{description}</p>
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** List skeleton for queue loads — never a spinner (auth screens keep their own). */
export function LoadingState({ rows = 8 }: { label?: string; rows?: number }) {
  return <ListSkeleton rows={rows} />;
}

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <Alert className="rounded-[5px] border-hold-border bg-hold-bg text-[#8a5a15]">
      <WifiOff className="size-4" />
      <AlertTitle className="text-[12px] font-semibold">You appear offline</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3 text-[11.5px]">
        <span>Queue data may be stale. Reconnect before taking irreversible actions.</span>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Could not load this queue. Try again.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <div className="font-display text-lg text-espresso">{title}</div>
      <p className="max-w-sm text-[12.5px] text-muted">{description}</p>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      ) : null}
    </div>
  );
}
