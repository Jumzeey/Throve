import { useAuth, roleLabel } from '@/auth/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function PageHeader({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  showTestMode = true,
  variant = 'page',
  className,
}: {
  title: string;
  subtitle?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showTestMode?: boolean;
  /** shell = Hi-Fi top bar: title | search | test mode | avatar */
  variant?: 'page' | 'shell';
  className?: string;
}) {
  const { session } = useAuth();
  const stamp = new Date().toLocaleString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  if (variant === 'shell') {
    return (
      <header
        className={cn(
          'flex shrink-0 items-center justify-between gap-6 border-b border-[#dccfc4] bg-panel px-[30px] py-[18px]',
          className,
        )}
      >
        <div className="min-w-0 shrink-0">
          <h1 className="font-display text-[27px] leading-tight text-espresso">{title}</h1>
          <p className="mt-0.5 text-[11.5px] text-muted">{subtitle ?? stamp}</p>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          {onSearchChange ? (
            <div className="relative w-full max-w-[290px]">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-2" />
              <Input
                value={search ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 rounded border-plum bg-panel pl-8 text-[12px] focus-visible:ring-plum/30"
              />
            </div>
          ) : null}
          {showTestMode ? (
            <Badge
              variant="outline"
              className="h-auto shrink-0 rounded border-[#e4cfa6] bg-[#fbf1e2] px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#8a5a15] uppercase"
            >
              Test mode
            </Badge>
          ) : null}
          {session ? (
            <div className="flex items-center gap-2.5 border-l border-border-soft pl-3.5">
              <span className="flex size-8 items-center justify-center rounded-full border border-[#d4c7be] bg-[#e2d7cc] text-[11.5px] font-semibold text-body">
                {initials(session.name)}
              </span>
              <span className="flex flex-col">
                <span className="text-[12px] font-semibold text-espresso">{session.name}</span>
                <span className="text-[10.5px] text-plum">{roleLabel(session.role)}</span>
              </span>
            </div>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className={cn('flex flex-col gap-3 border-b border-border-soft pb-4', className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[27px] leading-tight text-espresso">{title}</h1>
          {subtitle ? <p className="mt-1 text-[11.5px] text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {showTestMode ? (
              <Badge variant="outline" className="rounded-[3px] border-gold/40 bg-hold-bg text-[10px] text-[#8a5a15]">
                Test mode
              </Badge>
            ) : null}
            <span className="text-[10.5px] tabular-nums text-muted-2">As of {stamp}</span>
          </div>
          {session ? (
            <div className="text-right">
              <div className="text-[11px] font-semibold text-espresso">{session.name}</div>
              <div className="text-[10.5px] text-muted">{roleLabel(session.role)}</div>
            </div>
          ) : null}
        </div>
      </div>
      {onSearchChange ? (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-2" />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 bg-card pl-8 text-[12.5px]"
          />
        </div>
      ) : null}
    </header>
  );
}
