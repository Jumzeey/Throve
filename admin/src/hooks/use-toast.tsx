import { useCallback, useEffect, useState } from 'react';

export function useToast(ms = 2800) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(id);
  }, [toast, ms]);
  // Stable identity: pages list `show` in effect/callback deps, so a fresh function would refetch in a loop.
  const show = useCallback((message: string) => setToast(message), []);
  return {
    toast,
    show,
    banner: toast ? (
      <div className="rounded border border-clear-border bg-clear-bg px-3 py-2 text-[12px] text-clear">{toast}</div>
    ) : null,
  };
}
