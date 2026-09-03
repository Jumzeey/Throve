import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type PageChrome = {
  /** Page title in the universal shell header */
  title: string;
  /** Subheader under the title */
  subtitle?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Hide search in shell (default: show if placeholder or handler set) */
  hideSearch?: boolean;
  /** Edge-to-edge content (no shell padding) — for master/detail layouts */
  bleed?: boolean;
};

type Ctx = {
  chrome: PageChrome | null;
  setChrome: (next: PageChrome) => void;
  clearChrome: () => void;
};

const ShellChromeContext = createContext<Ctx | null>(null);

export function ShellChromeProvider({ children }: { children: ReactNode }) {
  const [chrome, setChromeState] = useState<PageChrome | null>(null);
  const setChrome = useCallback((next: PageChrome) => setChromeState(next), []);
  const clearChrome = useCallback(() => setChromeState(null), []);
  const value = useMemo(() => ({ chrome, setChrome, clearChrome }), [chrome, setChrome, clearChrome]);
  return <ShellChromeContext.Provider value={value}>{children}</ShellChromeContext.Provider>;
}

export function useShellChrome() {
  const ctx = useContext(ShellChromeContext);
  if (!ctx) throw new Error('useShellChrome must be used within ShellChromeProvider');
  return ctx;
}

/** Register header + subheader (+ optional search) for the universal shell. */
export function usePageChrome(config: PageChrome) {
  const { setChrome, clearChrome } = useShellChrome();
  const { title, subtitle, search, onSearchChange, searchPlaceholder, hideSearch, bleed } = config;

  useEffect(() => {
    setChrome({ title, subtitle, search, onSearchChange, searchPlaceholder, hideSearch, bleed });
  }, [title, subtitle, search, onSearchChange, searchPlaceholder, hideSearch, bleed, setChrome]);

  useEffect(() => () => clearChrome(), [clearChrome]);
}
