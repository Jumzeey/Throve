import { useEffect, useState } from 'react';

/** Matches Tailwind `md` — tablet and up. */
const MD_UP = '(min-width: 768px)';

export function useMdUp() {
  const [mdUp, setMdUp] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MD_UP).matches : true,
  );

  useEffect(() => {
    const mql = window.matchMedia(MD_UP);
    const onChange = () => setMdUp(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return mdUp;
}
