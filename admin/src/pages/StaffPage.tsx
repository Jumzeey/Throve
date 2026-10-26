import { useCallback, useEffect, useState } from 'react';
import {
  fetchStaff,
  cancelStaffInvite,
  fetchStaffInvites,
  inviteStaff,
  resendStaffInvite,
  type StaffInvite,
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
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
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

  const loadInvites = useCallback(async () => {
    try {
      const data = await fetchStaffInvites();
      setInvites(data.invites);
    } catch {
      // the staff list still works without it
    }
  }, []);

  useEffect(() => {
    void load();
    void loadInvites();
  }, [load, loadInvites]);

  const inviteEmailOk = /^[^\s@]+@throve\.store$/i.test(inviteEmail.trim());

  async function sendInvite() {
    if (!inviteEmailOk || !inviteRole || !inviteName.trim()) return;
    setInviteBusy(true);
    setInviteError(null);
    try {
      await inviteStaff({ email: inviteEmail.trim().toLowerCase(), name: inviteName.trim(), role: inviteRole });
      show(`Invite sent to ${inviteEmail.trim().toLowerCase()}`);
      setInviteEmail('');
      setInviteName('');
      setInviteRole(null);
      await loadInvites();
    } catch (err) {
      setInviteError(errorMessage(err, 'Could not send the invite'));
    } finally {
      setInviteBusy(false);
    }
  }

  async function inviteAction(kind: 'resend' | 'cancel', invite: StaffInvite) {
    setActionError(null);
    try {
      if (kind === 'resend') {
        await resendStaffInvite(invite.id);
        show(`Invite re-sent to ${invite.email}`);
      } else {
        await cancelStaffInvite(invite.id);
        show('Invite cancelled');
      }
      await loadInvites();
    } catch (err) {
      setActionError(errorMessage(err, 'Action failed'));
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

      <Panel
        title="Invite staff"
        subtitle="Only @throve.store addresses. They get an email link to confirm the address and set a password before they can sign in."
      >
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void sendInvite();
          }}
        >
          <div className="flex flex-col gap-1">
            <Input
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteError(null);
              }}
              placeholder="name@throve.store"
              className="h-8 w-[240px] bg-card text-[12.5px]"
            />
            {inviteEmail.trim() && !inviteEmailOk ? (
              <span className="text-[11px] text-risk">Must be a @throve.store address</span>
            ) : null}
          </div>
          <Input
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
            placeholder="Full name"
            className="h-8 w-[180px] bg-card text-[12.5px]"
          />
          <RoleSelect value={inviteRole} onChange={setInviteRole} />
          <Button
            type="submit"
            size="sm"
            disabled={inviteBusy || !inviteEmailOk || !inviteRole || !inviteName.trim()}
          >
            {inviteBusy ? 'Sending…' : 'Send invite'}
          </Button>
        </form>
        {inviteError ? <div className="mt-2 text-[12px] text-risk">{inviteError}</div> : null}

        {invites.length ? (
          <div className="mt-4 flex flex-col divide-y divide-divider border-t border-divider">
            {invites.map((invite) => (
              <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-espresso">
                    {invite.name || invite.email}
                    <StatusBadge tone={invite.state === 'expired' ? 'risk' : 'gold'}>
                      {invite.state === 'expired' ? 'Expired' : 'Invite sent'}
                    </StatusBadge>
                  </div>
                  <div className="text-[11.5px] text-muted">
                    {invite.email} · {ROLE_LABELS[invite.role]} ·{' '}
                    {invite.state === 'expired'
                      ? 'link expired'
                      : `link expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => void inviteAction('resend', invite)}>
                    Resend
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void inviteAction('cancel', invite)}>
                    Cancel invite
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
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
