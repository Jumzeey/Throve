import { useEffect, useState } from 'react';

/** Matches Tailwind `lg` — same breakpoint BleedSplit uses for the inspector Sheet. */
const LG_UP = '(min-width: 1024px)';

export function useLgUp() {
  const [lgUp, setLgUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(LG_UP).matches : true,
  );

  useEffect(() => {
    const mql = window.matchMedia(LG_UP);
    const onChange = () => setLgUp(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return lgUp;
}

/**
 * Desktop (lg+): preselect the first id so the side inspector is filled.
 * Mobile: start with no selection so the inspector Sheet stays closed until a row tap.
 */
export function useBleedSelection(preferredId: string | null | undefined) {
  const lgUp = useLgUp();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return preferredId ?? null;
    return window.matchMedia(LG_UP).matches ? (preferredId ?? null) : null;
  });

  useEffect(() => {
    if (!lgUp) return;
    setSelectedId((current) => current ?? preferredId ?? null);
  }, [lgUp, preferredId]);

  return [selectedId, setSelectedId] as const;
}
