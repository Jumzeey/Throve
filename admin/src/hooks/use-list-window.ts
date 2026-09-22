import { useEffect, useRef, useState, type RefObject } from 'react';
import { useMdUp } from '@/hooks/use-md-up';

const DEFAULT_PAGE_SIZE = 12;

export type ListWindowState<T> = {
  /** Rows to render for the current mode/page. */
  visible: T[];
  /** Attach to the list's `overflow-auto` scroll container. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Mobile infinite-scroll sentinel — place after the last visible row. */
  sentinelRef: RefObject<HTMLDivElement | null>;
  scrollToTop: () => void;
  /** true = classic pagination (tablet/desktop); false = infinite scroll (mobile) */
  paginated: boolean;
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  pageSize: number;
  total: number;
  /** Mobile: more rows available to load */
  hasMore: boolean;
  showingFrom: number;
  showingTo: number;
};

/**
 * Mobile (&lt; md): growing window (infinite scroll).
 * Tablet/desktop (md+): fixed page slices with controls.
 */
export function useListWindow<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE): ListWindowState<T> {
  const paginated = useMdUp();
  const [page, setPage] = useState(1);
  const [mobileCount, setMobileCount] = useState(pageSize);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when the filtered set changes (length + endpoints are a cheap fingerprint).
  const fingerprint = `${items.length}:${String((items[0] as { id?: string } | undefined)?.id ?? '')}:${String((items[items.length - 1] as { id?: string } | undefined)?.id ?? '')}`;

  useEffect(() => {
    setPage(1);
    setMobileCount(pageSize);
  }, [fingerprint, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);

  const visible = paginated
    ? items.slice((safePage - 1) * pageSize, safePage * pageSize)
    : items.slice(0, mobileCount);

  const hasMore = !paginated && mobileCount < items.length;

  useEffect(() => {
    if (paginated || !hasMore) return;
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMobileCount((c) => Math.min(c + pageSize, items.length));
        }
      },
      { root, rootMargin: '120px', threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [paginated, hasMore, items.length, pageSize, mobileCount]);

  function scrollToTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const showingFrom = items.length === 0 ? 0 : paginated ? (safePage - 1) * pageSize + 1 : 1;
  const showingTo = paginated
    ? Math.min(safePage * pageSize, items.length)
    : Math.min(mobileCount, items.length);

  return {
    visible,
    scrollRef,
    sentinelRef,
    scrollToTop,
    paginated,
    page: safePage,
    setPage,
    totalPages,
    pageSize,
    total: items.length,
    hasMore,
    showingFrom,
    showingTo,
  };
}
