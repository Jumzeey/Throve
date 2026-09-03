import { Link } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { FieldRow, RestrictedValue } from '@/components/admin/field-row';
import { Panel } from '@/components/admin/panel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { usePageChrome } from '@/components/layout/shell-chrome';

export function AccessDeniedPage() {
  const { session } = useAuth();
  usePageChrome({
    title: "Access denied",
    subtitle: "This module is outside your role’s least-privilege scope",
    hideSearch: true,
  });

  return (
    <div className="flex flex-col gap-5">

      <Panel>
        <Alert>
          <AlertTitle>Restricted module</AlertTitle>
          <AlertDescription>
            {session
              ? `Your role (${roleLabel(session.role)}) cannot open this area. Nothing unconfirmed was carried out.`
              : 'Sign in again to continue.'}
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-2">
          <Button asChild>
            <Link to="/">Back to Operations</Link>
          </Button>
          {!session ? (
            <Button asChild variant="outline">
              <Link to="/login">Sign in again</Link>
            </Button>
          ) : null}
        </div>
      </Panel>

      <Panel title="A14 deny patterns" subtitle="Prefer hide over disable; mask sensitive fields as Restricted">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded border border-border-soft p-3">
            <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Hidden</div>
            <p className="mt-2 text-[12px] leading-relaxed text-body">
              Forbidden controls are not rendered. Example: Support never sees “End Live” or “Execute refund”.
            </p>
            <div className="mt-3 rounded bg-panel-elevated px-3 py-4 text-center text-[11px] text-muted-2">
              [ Ban account — not shown ]
            </div>
          </div>

          <div className="rounded border border-border-soft p-3">
            <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Disabled (rare)</div>
            <p className="mt-2 text-[12px] leading-relaxed text-body">
              Only when the control must remain visible for orientation. Prefer hide.
            </p>
            <div className="mt-3 flex items-center gap-2 opacity-50">
              <Checkbox disabled checked={false} />
              <span className="text-[12px] text-muted">Mark paid (not allowed)</span>
            </div>
          </div>

          <div className="rounded border border-border-soft p-3">
            <div className="text-[10px] font-semibold tracking-[0.12em] text-muted-2 uppercase">Masked</div>
            <p className="mt-2 text-[12px] leading-relaxed text-body">
              Support sees payout/KYC as Restricted instead of values.
            </p>
            <div className="mt-2">
              <FieldRow label="Payout account" restricted>
                •••• 4821
              </FieldRow>
              <FieldRow label="KYC docs">
                <RestrictedValue />
              </FieldRow>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
