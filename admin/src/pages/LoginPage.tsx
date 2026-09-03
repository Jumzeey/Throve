import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { FilterChips } from '@/components/admin/filter-chips';
import { OfflineBanner } from '@/components/admin/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROLE_LABELS, type AdminRole } from '@/lib/roles';
import { Loader2 } from 'lucide-react';

const DEMO_ROLES: { role: AdminRole; name: string; email: string }[] = [
  { role: 'super_admin', name: 'Amara Nwosu', email: 'amara@throve.store' },
  { role: 'trust_safety', name: 'O. Bello', email: 'safety@throve.store' },
  { role: 'support', name: 'S. Mensah', email: 'support@throve.store' },
  { role: 'finance', name: 'A. Okoro', email: 'finance@throve.store' },
];

type GateState = 'form' | 'verifying' | 'authorized' | 'unauthorized' | 'revoked' | 'expired' | 'offline';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('amara@throve.store');
  const [password, setPassword] = useState('••••••••');
  const [role, setRole] = useState<AdminRole>('super_admin');
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateState>('form');

  useEffect(() => {
    if (gate !== 'verifying') return;
    const id = window.setTimeout(() => {
      setGate('authorized');
      const demo = DEMO_ROLES.find((d) => d.role === role)!;
      signIn({ email: email.trim() || demo.email, name: demo.name, role });
    }, 900);
    return () => window.clearTimeout(id);
  }, [gate, role, email, signIn]);

  if (session && gate !== 'verifying') return <Navigate to="/" replace />;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (gate === 'offline') {
      setError('Reconnect before signing in.');
      return;
    }
    if (gate === 'unauthorized' || gate === 'revoked' || gate === 'expired') {
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('Enter your staff email and password.');
      return;
    }
    setError(null);
    setGate('verifying');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ground px-4 py-10">
      <div className="mb-4 w-full max-w-[420px]">
        <div className="mb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-2 uppercase">
          A01 access-gate preview (mock)
        </div>
        <FilterChips
          value={gate === 'authorized' ? 'form' : gate}
          onChange={(id) => {
            setError(null);
            setGate(id as GateState);
          }}
          options={[
            { id: 'form', label: 'Ready' },
            { id: 'verifying', label: 'Verifying' },
            { id: 'unauthorized', label: 'Unauthorized' },
            { id: 'revoked', label: 'Revoked' },
            { id: 'expired', label: 'Expired' },
            { id: 'offline', label: 'Offline' },
          ]}
        />
      </div>

      <Card className="w-full max-w-[420px] rounded-[10px] border-border bg-card shadow-[0_18px_44px_rgba(43,33,31,0.09)]">
        <CardHeader className="space-y-1">
          <div className="font-display text-[28px] leading-none text-plum">throve</div>
          <div className="text-[9.5px] font-semibold uppercase tracking-[0.2em] text-gold">Admin console</div>
          <CardTitle className="pt-4 font-display text-[32px] font-normal leading-tight text-espresso">
            Sign in to continue
          </CardTitle>
          <CardDescription className="text-[13px] leading-relaxed text-body">
            Protected staff access only. Navigation and actions follow least privilege for your role.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {gate === 'offline' ? <OfflineBanner onRetry={() => setGate('form')} /> : null}

          {gate === 'verifying' ? (
            <div className="flex flex-col items-center gap-2 py-8 text-[12.5px] text-muted">
              <Loader2 className="size-5 animate-spin text-plum" />
              Verifying staff credentials…
            </div>
          ) : null}

          {gate === 'unauthorized' ? (
            <Alert variant="destructive">
              <AlertTitle>Unauthorized</AlertTitle>
              <AlertDescription>This account is not provisioned for the admin console.</AlertDescription>
            </Alert>
          ) : null}

          {gate === 'revoked' ? (
            <Alert variant="destructive">
              <AlertTitle>Access revoked</AlertTitle>
              <AlertDescription>Your staff access was revoked. Contact a Super Admin.</AlertDescription>
            </Alert>
          ) : null}

          {gate === 'expired' ? (
            <Alert className="border-hold-border bg-hold-bg text-[#8a5a15]">
              <AlertTitle>Session expired</AlertTitle>
              <AlertDescription>Sign in again to continue your shift.</AlertDescription>
            </Alert>
          ) : null}

          {gate === 'form' || gate === 'expired' || gate === 'offline' ? (
            <form className="flex flex-col gap-3" onSubmit={onSubmit}>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                  Staff email
                </Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-panel-elevated"
                  disabled={gate === 'offline'}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-panel-elevated"
                  disabled={gate === 'offline'}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-2">Demo role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => {
                    const next = value as AdminRole;
                    setRole(next);
                    const demo = DEMO_ROLES.find((d) => d.role === next)!;
                    setEmail(demo.email);
                  }}
                  disabled={gate === 'offline'}
                >
                  <SelectTrigger className="w-full bg-panel-elevated">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error ? (
                <Alert variant="destructive">
                  <AlertTitle>Could not sign in</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" className="mt-1 w-full" disabled={gate === 'offline'}>
                Sign in
              </Button>
            </form>
          ) : null}

          {(gate === 'unauthorized' || gate === 'revoked') && (
            <Button type="button" variant="outline" onClick={() => setGate('form')}>
              Back to sign in
            </Button>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Mock auth for UI prototype — no backend call. Use the gate chips above to preview A01 states.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
