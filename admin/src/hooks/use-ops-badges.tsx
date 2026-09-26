import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchOpsBadges, type AdminOpsBadges } from '@/api/ops';
import { useAuth } from '@/auth/AuthContext';
import { setOpsBadgesInvalidator } from '@/lib/ops-badges-invalidate';

export { invalidateOpsBadges } from '@/lib/ops-badges-invalidate';

type OpsBadgesStatus = 'idle' | 'loading' | 'error';

type OpsBadgesContextValue = {
  badges: AdminOpsBadges;
  status: OpsBadgesStatus;
  refresh: () => Promise<void>;
  invalidate: () => void;
};

const OpsBadgesContext = createContext<OpsBadgesContextValue | null>(null);

const EMPTY_BADGES: AdminOpsBadges = {
  listings: 0,
  reports: 0,
  live: 0,
  disputes: 0,
  orders: 0,
  payments: 0,
  refunds: 0,
  payouts: 0,
};

const DEBOUNCE_MS = 400;

export function OpsBadgesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const accessToken = session?.accessToken ?? null;
  const [badges, setBadges] = useState<AdminOpsBadges>(EMPTY_BADGES);
  const [status, setStatus] = useState<OpsBadgesStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setBadges(EMPTY_BADGES);
      setStatus('idle');
      return;
    }
    const gen = ++inFlightRef.current;
    setStatus('loading');
    try {
      const data = await fetchOpsBadges();
      if (gen !== inFlightRef.current) return;
      setBadges(data);
      setStatus('idle');
    } catch {
      if (gen !== inFlightRef.current) return;
      setStatus('error');
    }
  }, [accessToken]);

  const invalidate = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void refresh();
    }, DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    setOpsBadgesInvalidator(invalidate);
    return () => {
      setOpsBadgesInvalidator(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [invalidate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!accessToken) return;
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [accessToken, refresh]);

  const value = useMemo(
    () => ({ badges, status, refresh, invalidate }),
    [badges, status, refresh, invalidate],
  );

  return <OpsBadgesContext.Provider value={value}>{children}</OpsBadgesContext.Provider>;
}

export function useOpsBadges() {
  const ctx = useContext(OpsBadgesContext);
  if (!ctx) throw new Error('useOpsBadges must be used within OpsBadgesProvider');
  return ctx;
}
