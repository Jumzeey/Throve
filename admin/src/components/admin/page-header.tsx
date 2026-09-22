import { useAuth, roleLabel } from '@/auth/AuthContext';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Menu, Search } from 'lucide-react';
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
  onMenuClick,
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
  onMenuClick?: () => void;
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
          'flex shrink-0 flex-col gap-3 border-b border-[#dccfc4] bg-panel px-4 py-3 md:gap-0 md:px-[30px] md:py-[18px]',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 md:gap-6">
          <div className="flex min-w-0 items-start gap-2.5">
            {onMenuClick ? (
              <button
                type="button"
                onClick={onMenuClick}
                className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[5px] border border-[#e2d7cc] bg-panel text-espresso lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-4" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h1 className="font-display text-[22px] leading-tight text-espresso md:text-[27px]">{title}</h1>
              <p className="mt-0.5 truncate text-[11px] leading-snug text-body md:text-[12px]">
                {subtitle ?? stamp}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            {onSearchChange ? (
              <div className="relative hidden w-full max-w-[290px] md:block">
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
                className="hidden h-auto shrink-0 rounded border-[#e4cfa6] bg-[#fbf1e2] px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.12em] text-[#8a5a15] uppercase sm:inline-flex"
              >
                Test mode
              </Badge>
            ) : null}
            {session ? (
              <div className="flex items-center gap-2.5 border-l border-border-soft pl-2.5 md:pl-3.5">
                <span className="flex size-8 items-center justify-center rounded-full border border-[#d4c7be] bg-[#e2d7cc] text-[11.5px] font-semibold text-body">
                  {initials(session.name)}
                </span>
                <span className="hidden flex-col md:flex">
                  <span className="text-[12px] font-semibold text-espresso">{session.name}</span>
                  <span className="text-[10.5px] text-plum">{roleLabel(session.role)}</span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
        {onSearchChange ? (
          <div className="relative w-full md:hidden">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-2" />
            <Input
              value={search ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 rounded border-plum bg-panel pl-8 text-[12px] focus-visible:ring-plum/30"
            />
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className={cn('flex flex-col gap-3 border-b border-border-soft pb-4', className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[27px] leading-tight text-espresso">{title}</h1>
          {subtitle ? <p className="mt-1 text-[12px] leading-snug text-body">{subtitle}</p> : null}
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
