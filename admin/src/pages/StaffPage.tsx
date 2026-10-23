import { useCallback, useEffect, useState } from 'react';
import {
  fetchStaff,
  lookupStaffCandidate,
  removeStaff,
  restoreStaff,
  revokeStaff,
  setStaffRole,
  type StaffMember,
} from '@/api/staff';
import { useAuth } from '@/auth/AuthContext';
import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { ListSkeleton } from '@/components/admin/loading-skeleton';
import { Panel } from '@/components/admin/panel';
import { StatusBadge } from '@/components/admin/status-badge';
import { usePageChrome } from '@/components/layout/shell-chrome';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';
import { ROLE_LABELS, type AdminRole } from '@/lib/roles';

const ROLES: AdminRole[] = ['super_admin', 'trust_safety', 'support', 'finance'];

type PendingAction =
  | { kind: 'role'; member: StaffMember; role: AdminRole }
  | { kind: 'revoke' | 'restore' | 'remove'; member: StaffMember };

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: AdminRole | null;
  onChange: (role: AdminRole) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value ?? undefined} onValueChange={(v) => onChange(v as AdminRole)} disabled={disabled}>
      <SelectTrigger className="h-8 w-[170px] bg-card text-[12px]">
        <SelectValue placeholder="Choose a role" />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role} className="text-[12px]">
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function confirmCopy(action: PendingAction) {
  const who = action.member.name || `@${action.member.username}`;
  switch (action.kind) {
    case 'role':
      return action.member.role
        ? {
            title: 'Change staff role',
            description: `${who} will become ${ROLE_LABELS[action.role]}. Their console access changes immediately.`,
            confirmLabel: 'Change role',
            destructive: false,
          }
        : {
            title: 'Grant staff access',
            description: `${who} will be able to sign in to Throve Admin as ${ROLE_LABELS[action.role]}.`,
            confirmLabel: 'Grant access',
            destructive: false,
          };
    case 'revoke':
      return {
        title: 'Revoke console access',
        description: `${who} will be signed out of Throve Admin. Their role stays on record so you can restore it later.`,
        confirmLabel: 'Revoke access',
        destructive: true,
      };
    case 'restore':
      return {
        title: 'Restore console access',
        description: `${who} will be able to sign in again as ${action.member.role ? ROLE_LABELS[action.member.role] : 'staff'}.`,
        confirmLabel: 'Restore access',
        destructive: false,
      };
    case 'remove':
      return {
        title: 'Remove from staff',
        description: `${who} goes back to being a normal Throve customer and loses all console access.`,
        confirmLabel: 'Remove',
        destructive: true,
      };
  }
}

export function StaffPage() {
  const { session } = useAuth();
  const { banner, show } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lookup, setLookup] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<StaffMember | null>(null);
  const [candidateRole, setCandidateRole] = useState<AdminRole | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  usePageChrome({
    title: 'Staff access',
    subtitle: 'Grant, change and revoke Throve Admin roles. Only super admins see this page.',
    hideSearch: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchStaff();
      setStaff(data.staff);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load staff'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function findCandidate() {
    setLookupBusy(true);
    setLookupError(null);
    setCandidate(null);
    setCandidateRole(null);
    try {
      const { user } = await lookupStaffCandidate(lookup);
      setCandidate(user);
      setCandidateRole(user.role);
    } catch (err) {
      setLookupError(errorMessage(err, 'Lookup failed'));
    } finally {
      setLookupBusy(false);
    }
  }

  async function runAction(action: PendingAction, reason: string) {
    setActionError(null);
    try {
      if (action.kind === 'role') await setStaffRole(action.member.id, action.role, reason);
      else if (action.kind === 'revoke') await revokeStaff(action.member.id, reason);
      else if (action.kind === 'restore') await restoreStaff(action.member.id, reason);
      else await removeStaff(action.member.id, reason);
      show(confirmCopy(action).confirmLabel.replace(/^./, (c) => c.toUpperCase()) + ' · done');
      if (candidate?.id === action.member.id) {
        setCandidate(null);
        setLookup('');
      }
      await load();
    } catch (err) {
      setActionError(errorMessage(err, 'Action failed'));
    }
  }

  const copy = pending ? confirmCopy(pending) : null;

  return (
    <div className="flex flex-col gap-4">
      {banner}
      {actionError ? (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      ) : null}

      <Panel title="Add staff" subtitle="The person needs a Throve account first. Search by email or username.">
        <div className="flex flex-col gap-3">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void findCandidate();
            }}
          >
            <Input
              value={lookup}
              onChange={(e) => setLookup(e.target.value)}
              placeholder="name@example.com or @username"
              className="h-8 w-[280px] bg-card text-[12.5px]"
            />
            <Button type="submit" size="sm" disabled={lookupBusy || lookup.trim().length < 3}>
              {lookupBusy ? 'Searching…' : 'Find account'}
            </Button>
          </form>
          {lookupError ? <div className="text-[12px] text-risk">{lookupError}</div> : null}
          {candidate ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-border-soft bg-panel-elevated px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-espresso">
                  {candidate.name || `@${candidate.username}`}
                </div>
                <div className="text-[11.5px] text-muted">
                  @{candidate.username} · {candidate.email}
                  {candidate.role ? ` · currently ${ROLE_LABELS[candidate.role]}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RoleSelect
                  value={candidateRole}
                  onChange={setCandidateRole}
                  disabled={candidate.id === session?.userId}
                />
                <Button
                  size="sm"
                  disabled={!candidateRole || candidate.id === session?.userId}
                  onClick={() => candidateRole && setPending({ kind: 'role', member: candidate, role: candidateRole })}
                >
                  {candidate.role ? 'Change role' : 'Grant access'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel title="Current staff">
        {loading ? (
          <ListSkeleton />
        ) : loadError ? (
          <Alert variant="destructive">
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        ) : staff.length === 0 ? (
          <EmptyState title="No staff yet" description="Grant access to someone above." />
        ) : (
          <div className="flex flex-col divide-y divide-divider">
            {staff.map((member) => {
              const isSelf = member.id === session?.userId;
              return (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[13px] font-semibold text-espresso">
                      {member.name || `@${member.username}`}
                      {isSelf ? <span className="text-[11px] font-normal text-muted">(you)</span> : null}
                      <StatusBadge tone={member.active ? 'clear' : 'risk'}>
                        {member.active ? 'Active' : 'Revoked'}
                      </StatusBadge>
                    </div>
                    <div className="text-[11.5px] text-muted">
                      @{member.username} · {member.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleSelect
                      value={member.role}
                      disabled={isSelf}
                      onChange={(role) => {
                        if (role !== member.role) setPending({ kind: 'role', member, role });
                      }}
                    />
                    {member.active ? (
                      <Button size="sm" variant="outline" disabled={isSelf} onClick={() => setPending({ kind: 'revoke', member })}>
                        Revoke
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={isSelf} onClick={() => setPending({ kind: 'restore', member })}>
                        Restore
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={isSelf} onClick={() => setPending({ kind: 'remove', member })}>
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-3 text-[11.5px] text-muted">
          You can’t change your own access. Another super admin has to do it, so there is always at least one
          super admin who can manage staff.
        </div>
      </Panel>

      {pending && copy ? (
        <ConfirmActionDialog
          open
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          title={copy.title}
          description={copy.description}
          confirmLabel={copy.confirmLabel}
          destructive={copy.destructive}
          requireCheckbox={pending.kind === 'remove' || (pending.kind === 'role' && pending.role === 'super_admin')}
          checkboxLabel={
            pending.kind === 'remove'
              ? 'I understand this removes all of their staff access.'
              : 'I understand a super admin can manage all staff, money and moderation.'
          }
          onConfirm={(reason) => void runAction(pending, reason)}
        />
      ) : null}
    </div>
  );
}
