import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, Loader2 } from 'lucide-react';
import { acceptStaffInvite, fetchInvitePreview, type InvitePreview } from '@/api/staff';
import { BrandMark } from '@/components/brand-mark';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/roles';
import { cn } from '@/lib/utils';

const fieldInput =
  'w-full rounded-[6px] border border-[#e2d7cc] bg-panel px-3.5 py-3 text-[14px] text-espresso outline-none placeholder:text-[#b0a399] focus:border-plum disabled:opacity-50';

// Mirrors backend/src/lib/password.ts so people see what's missing before submitting.
function passwordChecks(password: string) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /\d/.test(password) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

/** Public page an invited @throve.store address lands on from the invite email. */
export function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoadError('This invite link is incomplete. Open the link from your email again.');
      return;
    }
    fetchInvitePreview(token)
      .then((data) => {
        setInvite(data);
        setName(data.name);
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Could not open this invite.'));
  }, [token]);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const ready = checks.every((c) => c.met) && password === confirm && name.trim().length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const { email } = await acceptStaffInvite({ token, password, name: name.trim() });
      navigate(`/login?invited=1&email=${encodeURIComponent(email)}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept the invite. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
      <div className="w-full max-w-[440px] rounded-[10px] border border-border-soft bg-card p-7">
        <BrandMark size="md" showWordmark />
        <h1 className="mt-6 font-display text-[26px] leading-tight text-espresso">Join Throve Admin</h1>

        {loadError ? (
          <>
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
            <Link to="/login" className="mt-4 inline-block text-[13px] font-semibold text-plum">
              Go to sign in
            </Link>
          </>
        ) : !invite ? (
          <div className="mt-6 flex items-center gap-2 text-[13px] text-muted">
            <Loader2 className="size-4 animate-spin" /> Checking your invite…
          </div>
        ) : (
          <form className="mt-4 flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
            <p className="text-[13px] leading-relaxed text-body">
              You&apos;re joining as <strong className="text-espresso">{ROLE_LABELS[invite.role]}</strong> with{' '}
              <strong className="text-espresso">{invite.email}</strong>. Set a password to confirm this address
              {invite.existingAccount ? ' (this also becomes the password for your existing Throve account)' : ''}.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <input id="name" className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                className={fieldInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                {checks.map((c) => (
                  <li
                    key={c.label}
                    className={cn('flex items-center gap-1.5 text-[11.5px]', c.met ? 'text-clear' : 'text-muted')}
                  >
                    <Check className={cn('size-3', c.met ? 'opacity-100' : 'opacity-30')} />
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                className={fieldInput}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              {confirm && confirm !== password ? (
                <span className="text-[11.5px] text-risk">Passwords don&apos;t match.</span>
              ) : null}
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={!ready || submitting}>
              {submitting ? 'Setting up…' : 'Accept invite'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
