import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth, roleLabel } from '@/auth/AuthContext';
import { BrandMark } from '@/components/brand-mark';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api';
import { consumeAuthGateReason } from '@/lib/session';
import { ROLE_LABELS, type AdminRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import { Check, Eye, EyeOff, Loader2, Lock } from 'lucide-react';

const DEMO_ROLES: { role: AdminRole; name: string; email: string; password: string }[] = [
  { role: 'super_admin', name: 'M. Okafor', email: 'okafor@throve.store', password: 'ThroveAdmin!2026' },
  { role: 'trust_safety', name: 'F. Adeyemi', email: 'safety@throve.store', password: 'ThroveAdmin!2026' },
  { role: 'support', name: 'S. Mensah', email: 'support@throve.store', password: 'ThroveAdmin!2026' },
  { role: 'finance', name: 'I. Danjuma', email: 'finance@throve.store', password: 'ThroveAdmin!2026' },
];

type GateState =
  | 'form'
  | 'verifying'
  | 'authorised'
  | 'unauthorized'
  | 'revoked'
  | 'expired'
  | 'offline'
  | 'auth_error'
  | 'unavailable';

const fieldInput =
  'w-full rounded-[6px] border border-[#e2d7cc] bg-panel px-3.5 py-3 text-[14px] text-espresso outline-none placeholder:text-[#b0a399] focus:border-plum disabled:opacity-50';

export function LoginPage() {
  const { session, loading, apiReady, signInWithPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [gate, setGate] = useState<GateState>('form');
  const [submitting, setSubmitting] = useState(false);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [welcomeRole, setWelcomeRole] = useState<AdminRole | null>(null);
  const [holdNavigate, setHoldNavigate] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get('reason');
    const stored = consumeAuthGateReason();
    const reason = fromQuery || stored;
    if (reason === 'expired') setGate('expired');
    else if (reason === 'revoked') setGate('revoked');
  }, [searchParams]);

  useEffect(() => {
    if (gate !== 'authorised' || !session || !holdNavigate) return;
    const t = window.setTimeout(() => setHoldNavigate(false), 1200);
    return () => window.clearTimeout(t);
  }, [gate, session, holdNavigate]);

  function validateFields() {
    const nextEmail = email.trim();
    const nextPassword = password;
    let ok = true;
    let nextEmailError: string | null = null;
    let nextPasswordError: string | null = null;

    if (!nextEmail) {
      nextEmailError = 'Work email is required.';
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      nextEmailError = 'Enter a valid work email address.';
      ok = false;
    }

    if (!nextPassword) {
      nextPasswordError = 'Password is required.';
      ok = false;
    }

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    return ok;
  }

  async function handleSignIn() {
    setError(null);
    if (gate === 'offline' || gate === 'unavailable') return;
    if (!validateFields()) return;

    if (!apiReady) {
      setGate('unavailable');
      return;
    }

    setSubmitting(true);
    setGate('verifying');
    try {
      const signedIn = await signInWithPassword({ email: email.trim(), password });
      setWelcomeName(signedIn.name);
      setWelcomeRole(signedIn.role);
      setGate('authorised');
      setHoldNavigate(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'NOT_PROVISIONED' || err.code === 'FORBIDDEN') {
          setGate('unauthorized');
        } else if (err.code === 'ACCESS_REVOKED') {
          setGate('revoked');
        } else if (err.code === 'SESSION_EXPIRED') {
          setGate('expired');
        } else if (err.status === 503 || err.code === 'UNAVAILABLE') {
          setGate('unavailable');
        } else if (err.status === 401 || err.code === 'UNAUTHORIZED') {
          setGate('form');
          setError('Invalid email or password. Check your details and try again.');
          setPasswordError('Incorrect password, or this email is not recognised.');
        } else {
          setGate('form');
          setError(
            err.message ||
              'Something went wrong signing you in. Try again in a moment. You have not been signed in.',
          );
        }
      } else if (err instanceof TypeError) {
        setGate('offline');
      } else {
        setGate('form');
        setError('Something went wrong signing you in. Try again in a moment. You have not been signed in.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void handleSignIn();
  }

  function resetToForm() {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    setGate('form');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground text-[12.5px] text-body">
        <Loader2 className="mr-2 size-4 animate-spin text-plum" />
        Checking your access…
      </div>
    );
  }

  if (session && !(gate === 'authorised' && holdNavigate)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="relative min-h-svh w-full overflow-x-hidden overflow-y-auto bg-[#241c1a] lg:h-svh lg:overflow-hidden">
      <div className="flex min-h-svh w-full flex-col lg:grid lg:h-full lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)]">
        {/* Mobile: single-line brand strip · Desktop: full brand panel */}
        <aside className="relative flex shrink-0 flex-row items-center gap-2.5 bg-sidebar px-4 py-2.5 text-panel sm:px-6 lg:min-h-0 lg:flex-col lg:items-stretch lg:justify-between lg:gap-0 lg:px-14 lg:py-12">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 lg:block lg:flex-none">
            <BrandMark variant="onDark" size="sm" showWordmark className="lg:hidden" />
            <BrandMark variant="onDark" size="md" showWordmark className="hidden lg:flex" />
            <div className="text-[9px] font-semibold tracking-[0.2em] text-gold uppercase sm:text-[9.5px] sm:tracking-[0.22em] lg:mt-2">
              Admin console
            </div>
          </div>

          <div className="mt-6 hidden max-w-[28rem] pb-1 lg:mt-0 lg:block">
            <h1 className="font-display text-[36px] leading-[1.15] font-normal text-panel lg:text-[44px]">
              An internal console for the people who keep Throve safe.
            </h1>
            <p className="mt-5 text-[14px] leading-relaxed text-[rgba(255,247,240,0.68)]">
              Separate from the customer app. Authorised staff accounts only, scoped to four roles. Sensitive actions
              are recorded.
            </p>
            <p className="mt-10 text-[12px] leading-relaxed text-[rgba(255,247,240,0.42)]">
              Super Admin · Trust &amp; Safety · Customer Support · Finance
            </p>
          </div>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col justify-start bg-[#f2eae2] px-5 py-6 sm:px-10 sm:py-8 lg:justify-center lg:overflow-y-auto lg:px-20 lg:py-12">
          <div className="mx-auto w-full max-w-[420px]">
            <BrandMark variant="onLight" size="sm" className="hidden lg:block" />
            <div className="mt-0 hidden text-[10px] font-semibold tracking-[0.2em] text-gold uppercase lg:mt-5 lg:block">
              Throve Admin
            </div>
            <h2 className="mt-0 font-display text-[28px] leading-tight font-normal text-espresso sm:text-[34px] lg:mt-3">
              Sign in to continue
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-body">
              Authorised staff access only. If you don&apos;t have an authorised Throve Admin account, you cannot sign
              in here.
            </p>

            <div className="mt-9 space-y-4">
              {gate === 'verifying' || submitting ? (
                <div className="flex flex-col items-center gap-3 rounded-[8px] border border-[#e2d7cc] bg-panel px-4 py-10 text-center">
                  <Loader2 className="size-7 animate-spin text-plum" />
                  <div className="text-[15px] font-semibold text-espresso">Checking your access</div>
                  <p className="max-w-[32ch] text-[12.5px] leading-relaxed text-body">
                    Confirming your admin account, role and permitted areas.
                  </p>
                </div>
              ) : null}

              {gate === 'authorised' && (session || welcomeName) ? (
                <div className="space-y-3">
                  <Alert className="rounded-[5px] border-clear-border bg-clear-bg">
                    <Check className="size-4 text-clear" />
                    <AlertTitle className="text-[13px] text-clear">
                      Welcome back, {welcomeName ?? session?.name}
                    </AlertTitle>
                    <AlertDescription className="text-[12px] text-clear">
                      Signed in as {roleLabel(welcomeRole ?? session!.role)}. Opening Operations.
                    </AlertDescription>
                  </Alert>
                  <p className="text-[11.5px] leading-relaxed text-body">
                    Your role decides which modules appear. Areas outside it are not shown at all.
                  </p>
                </div>
              ) : null}

              {gate === 'unauthorized' ? (
                <div className="space-y-4">
                  <div className="rounded-[5px] border border-[#e2d7cc] bg-panel px-4 py-4">
                    <div className="text-[14px] font-semibold text-espresso">
                      You don&apos;t have access to Throve Admin
                    </div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-body">
                      This account is not authorised for the admin console. If you believe this is wrong, contact your
                      Throve administrator.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={resetToForm}>
                    Back to sign-in
                  </Button>
                </div>
              ) : null}

              {gate === 'revoked' ? (
                <div className="space-y-3">
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[13px] text-[#8a5a15]">
                      Your access to Throve Admin is no longer active
                    </AlertTitle>
                    <AlertDescription className="text-[12px] text-[#8a5a15]">
                      Contact your Throve administrator if you need access restored.
                    </AlertDescription>
                  </Alert>
                  <p className="text-[11px] leading-relaxed text-body">
                    No self-service restore. No reason is shown here, and no prior role is revealed.
                  </p>
                  <Button type="button" variant="outline" className="w-full" onClick={resetToForm}>
                    Back to sign-in
                  </Button>
                </div>
              ) : null}

              {gate === 'expired' ? (
                <div className="space-y-4">
                  <div className="rounded-[5px] border border-[#e2d7cc] bg-panel px-4 py-4">
                    <div className="text-[14px] font-semibold text-espresso">Your admin session has expired</div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-body">Sign in again to continue.</p>
                  </div>
                  <div className="rounded-[5px] border border-[#e2d7cc] bg-panel px-4 py-3 text-[12px] leading-relaxed text-body">
                    Anything you had open but not confirmed was not carried over. No ban, decision, refund or payout was
                    executed by the session ending.
                  </div>
                  <Button
                    type="button"
                    className="w-full bg-[#3e2b36] text-panel hover:bg-[#2f2029]"
                    onClick={resetToForm}
                  >
                    Sign in again
                  </Button>
                </div>
              ) : null}

              {gate === 'auth_error' ? (
                <div className="space-y-3">
                  <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                    <AlertTitle className="text-[13px] text-risk">Something went wrong signing you in</AlertTitle>
                    <AlertDescription className="text-[12px] text-risk">
                      {error ?? 'Try again in a moment. You have not been signed in.'}
                    </AlertDescription>
                  </Alert>
                  <p className="text-[11px] leading-relaxed text-body">
                    Error copy never reveals whether an account exists, is disabled, or lacks a role.
                  </p>
                  <Button type="button" variant="outline" className="w-full" onClick={resetToForm}>
                    Try again
                  </Button>
                </div>
              ) : null}

              {gate === 'unavailable' ? (
                <div className="space-y-3">
                  <Alert className="rounded-[5px] border-hold-border bg-hold-bg">
                    <AlertTitle className="text-[13px] text-[#8a5a15]">
                      Throve Admin is temporarily unavailable
                    </AlertTitle>
                    <AlertDescription className="text-[12px] text-[#8a5a15]">
                      Sign-in is paused. Nothing you do here can bypass it.
                    </AlertDescription>
                  </Alert>
                  <Button type="button" variant="outline" className="w-full" onClick={resetToForm}>
                    Back to sign-in
                  </Button>
                </div>
              ) : null}

              {gate === 'offline' ? (
                <div className="space-y-3">
                  <div className="rounded-[5px] border border-[#e2d7cc] bg-panel px-4 py-4">
                    <div className="text-[14px] font-semibold text-espresso">No connection</div>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-body">
                      Sign-in needs a connection. There is no offline admin mode.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="w-full" onClick={resetToForm}>
                    Retry
                  </Button>
                </div>
              ) : null}

              {gate === 'form' ? (
                <form className="space-y-5" onSubmit={onSubmit} noValidate>
                  {error ? (
                    <Alert className="rounded-[5px] border-risk-border bg-risk-bg">
                      <AlertTitle className="text-[12px] text-risk">Could not sign in</AlertTitle>
                      <AlertDescription className="text-[11.5px] text-risk">{error}</AlertDescription>
                    </Alert>
                  ) : null}
                  <div className="flex flex-wrap gap-1.5">
                    {DEMO_ROLES.map((staff) => (
                      <button
                        key={staff.role}
                        type="button"
                        className="rounded-[4px] border border-[#e2d7cc] bg-panel px-2 py-1 text-[10.5px] font-semibold text-body hover:border-plum/40 hover:text-plum"
                        onClick={() => {
                          setEmail(staff.email);
                          setPassword(staff.password);
                          setEmailError(null);
                          setPasswordError(null);
                          setError(null);
                        }}
                      >
                        Fill {ROLE_LABELS[staff.role]}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="email"
                      className="text-[10px] font-semibold tracking-[0.14em] text-gold uppercase"
                    >
                      Work email
                    </Label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="username"
                      placeholder="name@throve.com"
                      value={email}
                      aria-invalid={Boolean(emailError)}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                        if (error) setError(null);
                      }}
                      className={cn(fieldInput, emailError && 'border-risk')}
                    />
                    {emailError ? <p className="text-[12px] text-risk">{emailError}</p> : null}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="password"
                      className="text-[10px] font-semibold tracking-[0.14em] text-gold uppercase"
                    >
                      Password
                    </Label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        aria-invalid={Boolean(passwordError)}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (passwordError) setPasswordError(null);
                          if (error) setError(null);
                        }}
                        className={cn(fieldInput, 'pr-11', passwordError && 'border-risk')}
                      />
                      <button
                        type="button"
                        className="absolute top-1/2 right-3 -translate-y-1/2 text-body hover:text-espresso"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {passwordError ? <p className="text-[12px] text-risk">{passwordError}</p> : null}
                  </div>
                  <Button
                    type="submit"
                    className={cn(
                      'mt-1 h-12 w-full rounded-[6px] bg-plum text-[14px] font-semibold text-panel hover:bg-[#4a1838]',
                      !apiReady && 'opacity-70',
                    )}
                    disabled={submitting || !apiReady}
                    onClick={(e) => {
                      // Ensure click always runs validation + API even if submit is intercepted
                      e.preventDefault();
                      void handleSignIn();
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                  <p className="text-[12px] leading-relaxed text-body">
                    You will complete password verification through Throve&apos;s approved internal authentication.
                  </p>
                </form>
              ) : null}
            </div>

            <div className="mt-12 flex items-start gap-2.5 border-t border-[#e2d7cc] pt-5 text-[12px] leading-relaxed text-body">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-body" />
              <span>
                Signing in is only the first check. Access also requires an active admin account with a valid role and
                permission for the area you open.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
