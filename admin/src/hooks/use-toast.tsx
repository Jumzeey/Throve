import { useEffect, useState } from 'react';

export function useToast(ms = 2800) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(id);
  }, [toast, ms]);
  return {
    toast,
    show: (message: string) => setToast(message),
    banner: toast ? (
      <div className="rounded border border-clear-border bg-clear-bg px-3 py-2 text-[12px] text-clear">{toast}</div>
    ) : null,
  };
}
