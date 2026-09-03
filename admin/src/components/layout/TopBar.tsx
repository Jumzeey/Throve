import { useAuth, roleLabel } from '../../auth/AuthContext';

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { session } = useAuth();
  return (
    <header className="flex items-end justify-between gap-4 border-b border-border-soft pb-4">
      <div>
        <h1 className="font-display text-[27px] leading-tight text-espresso">{title}</h1>
        {subtitle ? <p className="mt-1 text-[11.5px] text-muted">{subtitle}</p> : null}
      </div>
      {session ? (
        <div className="text-right">
          <div className="text-[11px] font-semibold text-espresso">{session.email}</div>
          <div className="text-[10.5px] text-muted">{roleLabel(session.role)}</div>
        </div>
      ) : null}
    </header>
  );
}
