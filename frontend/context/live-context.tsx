import { apiFetch } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import type {
  Listing,
  ListingStatus,
  LiveClaim,
  LiveComment,
  LiveConnection,
  LiveKitCredentials,
  LiveSession,
  LiveStreamProduct,
} from '@/data/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

export const CHECKOUT_RESERVE_MS = 10 * 60 * 1000;
export const MAX_LIVE_MODERATORS = 2;

export const SUGGESTED_MODERATORS = ['femi.k', 'ijeoma.a', 'chidinma.o', 'funke_b'] as const;

type StartLiveInput = {
  host: string;
  title: string;
  department: LiveSession['department'];
  description?: string;
  featuredListingIds: string[];
  products?: { listingId: string; livePrice: number; stock: number; isPinned?: boolean }[];
  scheduledAt?: string;
};

type LiveContextValue = {
  sessions: LiveSession[];
  activeBroadcastId: string | null;
  liveNow: LiveSession[];
  upcoming: LiveSession[];
  loading: boolean;
  roomNotice: string | null;
  refresh: () => Promise<void>;
  hydrateSession: (sessionId: string) => Promise<LiveSession | null>;
  getSession: (id: string) => LiveSession | undefined;
  getProducts: (sessionId: string) => LiveStreamProduct[];
  getPinnedProduct: (sessionId: string) => LiveStreamProduct | undefined;
  getComments: (sessionId: string) => LiveComment[];
  getConnection: (sessionId: string) => LiveConnection;
  setConnection: (sessionId: string, connection: LiveConnection) => void;
  getClaim: (sessionId: string) => LiveClaim | undefined;
  resolveListing: (id?: string) => Listing | undefined;
  listingStatus: (id?: string) => ListingStatus | undefined;
  sendComment: (sessionId: string, user: string, text: string) => Promise<void>;
  removeComment: (sessionId: string, commentId: string) => void;
  toggleConnection: (sessionId: string) => void;
  pinProduct: (sessionId: string, productId: string) => Promise<void>;
  pinListing: (sessionId: string, listingId: string) => Promise<void>;
  claimProduct: (sessionId: string, productId: string, quantity?: number) => Promise<LiveClaim>;
  claimListing: (sessionId: string, listingId: string, username: string) => Promise<void>;
  releaseClaim: (sessionId: string, productId: string, claimId: string) => Promise<void>;
  beginCheckoutReservation: (listingId: string, username: string, sessionId: string) => Promise<boolean>;
  completeSale: (listingId: string) => Promise<void>;
  releaseListing: (listingId: string) => Promise<void>;
  fetchLiveKitToken: (sessionId: string) => Promise<LiveKitCredentials>;
  startLive: (input: StartLiveInput) => Promise<LiveSession>;
  endLive: (sessionId: string) => Promise<void>;
  subscribeSession: (sessionId: string) => () => void;
  prepareModerators: string[];
  getModerators: (sessionId?: string) => string[];
  addPrepareModerator: (username: string) => void;
  removePrepareModerator: (username: string) => void;
  addSessionModerator: (sessionId: string, username: string) => void;
  removeSessionModerator: (sessionId: string, username: string) => void;
  isModerator: (sessionId: string | undefined, username: string) => boolean;
};

const LiveContext = createContext<LiveContextValue | null>(null);
const LiveClockContext = createContext(0);

function mapProductRow(row: Record<string, unknown>): LiveStreamProduct {
  const stock = Number(row.stock ?? 0);
  const reserved = Number(row.reserved_count ?? row.reservedCount ?? 0);
  const sold = Number(row.sold_count ?? row.soldCount ?? 0);
  return {
    id: String(row.id),
    liveSessionId: String(row.live_session_id ?? row.liveSessionId),
    listingId: String(row.listing_id ?? row.listingId),
    livePrice: Number(row.live_price ?? row.livePrice ?? 0),
    stock,
    reservedCount: reserved,
    soldCount: sold,
    available: Number(row.available ?? Math.max(0, stock - reserved - sold)),
    isPinned: Boolean(row.is_pinned ?? row.isPinned),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    title: row.title ? String(row.title) : undefined,
    photoUrls: Array.isArray(row.photo_urls)
      ? (row.photo_urls as string[])
      : Array.isArray(row.photoUrls)
        ? (row.photoUrls as string[])
        : undefined,
  };
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const { isReady } = useAuth();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [commentsBySession, setCommentsBySession] = useState<Record<string, LiveComment[]>>({});
  const [connections, setConnections] = useState<Record<string, LiveConnection>>({});
  const [claimsBySession, setClaimsBySession] = useState<Record<string, LiveClaim>>({});
  const [listingCache, setListingCache] = useState<Record<string, Listing>>({});
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [roomNotice, setRoomNotice] = useState<string | null>(null);
  const [prepareModerators, setPrepareModerators] = useState<string[]>([]);
  const [moderatorsBySession, setModeratorsBySession] = useState<Record<string, string[]>>({});
  const channelsRef = useRef<Record<string, RealtimeChannel>>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ liveNow: LiveSession[]; upcoming: LiveSession[]; all: LiveSession[] }>('/live/sessions');
      setSessions(data.all ?? [...data.liveNow, ...data.upcoming]);
    } catch {
      // Backend offline — live tab handles empty/offline UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    void refresh();
  }, [isReady, refresh]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const liveNow = useMemo(() => sessions.filter((session) => session.status === 'live'), [sessions]);
  const upcoming = useMemo(() => sessions.filter((session) => session.status === 'upcoming'), [sessions]);

  const getSession = useCallback((id: string) => sessions.find((session) => session.id === id), [sessions]);

  const getProducts = useCallback(
    (sessionId: string) => getSession(sessionId)?.products ?? [],
    [getSession],
  );

  const getPinnedProduct = useCallback(
    (sessionId: string) => getProducts(sessionId).find((p) => p.isPinned) ?? getProducts(sessionId)[0],
    [getProducts],
  );

  const hydrateSession = useCallback(async (sessionId: string) => {
    const session = await apiFetch<LiveSession>(`/live/sessions/${sessionId}`);
    setSessions((current) => {
      const idx = current.findIndex((s) => s.id === sessionId);
      if (idx === -1) return [session, ...current];
      const next = [...current];
      next[idx] = session;
      return next;
    });
    const [comments, claims] = await Promise.all([
      apiFetch<LiveComment[]>(`/live/sessions/${sessionId}/comments`),
      apiFetch<LiveClaim[]>(`/live/sessions/${sessionId}/claims/me`).catch(() => [] as LiveClaim[]),
    ]);
    setCommentsBySession((current) => ({ ...current, [sessionId]: comments }));
    const active = claims.find((c) => c.status === 'active');
    if (active) setClaimsBySession((current) => ({ ...current, [sessionId]: active }));
    return session;
  }, []);

  const subscribeSession = useCallback(
    (sessionId: string) => {
      if (channelsRef.current[sessionId]) {
        return () => undefined;
      }

      void hydrateSession(sessionId);

      const channel = supabase
        .channel(`live:${sessionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'live_comments', filter: `session_id=eq.${sessionId}` },
          async (payload) => {
            const row = payload.new as { id: string; user_id: string; text: string; client_id?: string };
            setCommentsBySession((current) => {
              const list = current[sessionId] ?? [];
              if (list.some((c) => c.id === row.id || (row.client_id && c.clientId === row.client_id))) return current;
              return {
                ...current,
                [sessionId]: [...list, { id: row.id, user: 'viewer', text: row.text, clientId: row.client_id }],
              };
            });
            // Refresh comments to resolve usernames
            try {
              const comments = await apiFetch<LiveComment[]>(`/live/sessions/${sessionId}/comments`);
              setCommentsBySession((current) => ({ ...current, [sessionId]: comments }));
            } catch {
              /* ignore */
            }
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_stream_products', filter: `live_session_id=eq.${sessionId}` },
          (payload) => {
            const row = payload.new as Record<string, unknown> | undefined;
            if (!row?.id) return;
            const product = mapProductRow(row);
            setSessions((current) =>
              current.map((session) => {
                if (session.id !== sessionId) return session;
                const products = [...(session.products ?? [])];
                const idx = products.findIndex((p) => p.id === product.id);
                if (payload.eventType === 'DELETE') {
                  return { ...session, products: products.filter((p) => p.id !== product.id) };
                }
                if (idx === -1) products.push(product);
                else products[idx] = { ...products[idx], ...product };
                const nextProducts = products.map((p) =>
                  p.id === product.id ? p : { ...p, isPinned: product.isPinned ? false : p.isPinned },
                );
                const pinned = nextProducts.find((p) => p.isPinned);
                return {
                  ...session,
                  products: nextProducts,
                  pinnedProductId: pinned?.id ?? (product.isPinned ? product.id : session.pinnedProductId),
                  pinnedListingId: pinned?.listingId ?? (product.isPinned ? product.listingId : session.pinnedListingId),
                };
              }),
            );
            if (product.isPinned) {
              setRoomNotice('New product pinned');
              setTimeout(() => setRoomNotice(null), 2500);
            }
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_claims', filter: `live_session_id=eq.${sessionId}` },
          (payload) => {
            const row = payload.new as Record<string, unknown> | undefined;
            if (!row) return;
            if (String(row.status) === 'active') {
              setRoomNotice('Someone claimed an item');
              setTimeout(() => setRoomNotice(null), 2000);
            }
            void hydrateSession(sessionId);
          },
        )
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const viewers = Object.keys(state).length;
          setSessions((current) =>
            current.map((session) => (session.id === sessionId ? { ...session, viewers } : session)),
          );
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ joined_at: Date.now() });
          }
        });

      channelsRef.current[sessionId] = channel;

      return () => {
        const existing = channelsRef.current[sessionId];
        if (existing) {
          void supabase.removeChannel(existing);
          delete channelsRef.current[sessionId];
        }
      };
    },
    [hydrateSession],
  );

  const getComments = useCallback((sessionId: string) => commentsBySession[sessionId] ?? [], [commentsBySession]);

  const getConnection = useCallback(
    (sessionId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (session?.status === 'ended') return 'ended';
      return connections[sessionId] ?? 'live';
    },
    [connections, sessions],
  );

  const setConnection = useCallback((sessionId: string, connection: LiveConnection) => {
    setConnections((current) => ({ ...current, [sessionId]: connection }));
  }, []);

  const getClaim = useCallback((sessionId: string) => claimsBySession[sessionId], [claimsBySession]);

  const resolveListing = useCallback(
    (id?: string) => (id ? listingCache[id] : undefined),
    [listingCache],
  );

  const listingStatus = useCallback(
    (id?: string) => (id ? listingCache[id]?.status : undefined),
    [listingCache],
  );

  const fetchListing = useCallback(async (sessionId: string, listingId: string) => {
    const listing = await apiFetch<Listing>(`/live/sessions/${sessionId}/listing/${listingId}`);
    setListingCache((current) => ({ ...current, [listingId]: listing }));
    return listing;
  }, []);

  const sendComment = useCallback(async (sessionId: string, _user: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const clientId = `c_${Date.now()}`;
    const comment = await apiFetch<LiveComment>(`/live/sessions/${sessionId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text: trimmed, clientId }),
    });
    setCommentsBySession((current) => {
      const list = current[sessionId] ?? [];
      if (list.some((c) => c.id === comment.id || c.clientId === clientId)) return current;
      return { ...current, [sessionId]: [...list, { ...comment, clientId }] };
    });
  }, []);

  const removeComment = useCallback((sessionId: string, commentId: string) => {
    setCommentsBySession((current) => ({
      ...current,
      [sessionId]: (current[sessionId] ?? []).filter((comment) => comment.id !== commentId),
    }));
  }, []);

  const toggleConnection = useCallback((sessionId: string) => {
    setConnections((current) => ({
      ...current,
      [sessionId]: current[sessionId] === 'lost' ? 'live' : 'lost',
    }));
  }, []);

  const pinProduct = useCallback(async (sessionId: string, productId: string) => {
    await apiFetch(`/live/sessions/${sessionId}/products/${productId}/pin`, { method: 'POST' });
    await hydrateSession(sessionId);
  }, [hydrateSession]);

  const pinListing = useCallback(
    async (sessionId: string, listingId: string) => {
      const product = getProducts(sessionId).find((p) => p.listingId === listingId);
      if (product) await pinProduct(sessionId, product.id);
      else await apiFetch(`/live/sessions/${sessionId}/pin/${listingId}`, { method: 'POST' });
      await hydrateSession(sessionId);
    },
    [getProducts, hydrateSession, pinProduct],
  );

  const claimProduct = useCallback(
    async (sessionId: string, productId: string, quantity = 1) => {
      const claim = await apiFetch<LiveClaim>(`/live/sessions/${sessionId}/products/${productId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ quantity }),
      });
      setClaimsBySession((current) => ({ ...current, [sessionId]: claim }));
      setRoomNotice('Claim secured — complete checkout');
      setTimeout(() => setRoomNotice(null), 2500);
      return claim;
    },
    [],
  );

  const claimListing = useCallback(
    async (sessionId: string, listingId: string, _username: string) => {
      const product = getProducts(sessionId).find((p) => p.listingId === listingId);
      if (product) {
        await claimProduct(sessionId, product.id, 1);
        return;
      }
      const claim = await apiFetch<LiveClaim>(`/live/sessions/${sessionId}/claim/${listingId}`, { method: 'POST' });
      setClaimsBySession((current) => ({ ...current, [sessionId]: claim }));
      await fetchListing(sessionId, listingId);
    },
    [claimProduct, fetchListing, getProducts],
  );

  const releaseClaim = useCallback(async (sessionId: string, productId: string, claimId: string) => {
    await apiFetch(`/live/sessions/${sessionId}/products/${productId}/release`, {
      method: 'POST',
      body: JSON.stringify({ claimId }),
    });
    setClaimsBySession((current) => {
      const next = { ...current };
      if (next[sessionId]?.id === claimId) delete next[sessionId];
      return next;
    });
    await hydrateSession(sessionId);
  }, [hydrateSession]);

  const beginCheckoutReservation = useCallback(
    async (listingId: string, _username: string, sessionId: string) => {
      try {
        const product = getProducts(sessionId).find((p) => p.listingId === listingId) ?? getPinnedProduct(sessionId);
        const claim = getClaim(sessionId);
        await apiFetch('/checkout/start', {
          method: 'POST',
          body: JSON.stringify({
            listingId,
            liveSessionId: sessionId,
            liveStreamProductId: product?.id,
            claimId: claim?.id,
          }),
        });
        return true;
      } catch {
        return false;
      }
    },
    [getClaim, getPinnedProduct, getProducts],
  );

  const completeSale = useCallback(async (listingId: string) => {
    setListingCache((current) => {
      const listing = current[listingId];
      if (!listing) return current;
      return { ...current, [listingId]: { ...listing, status: 'sold' } };
    });
  }, []);

  const releaseListing = useCallback(async (listingId: string) => {
    const entry = Object.entries(claimsBySession).find(([, claim]) => claim.listingId === listingId);
    if (entry) {
      const [sessionId, claim] = entry;
      if (claim.productId && claim.id) {
        try {
          await releaseClaim(sessionId, claim.productId, claim.id);
          return;
        } catch {
          /* fall through */
        }
      }
    }
    try {
      await apiFetch(`/listings/${listingId}/release`, { method: 'POST' });
    } catch {
      /* ignore */
    }
  }, [claimsBySession, releaseClaim]);

  const fetchLiveKitToken = useCallback(async (sessionId: string) => {
    return apiFetch<LiveKitCredentials>(`/live/sessions/${sessionId}/token`, { method: 'POST' });
  }, []);

  const startLive = useCallback(async (input: StartLiveInput) => {
    const listings = input.featuredListingIds;
    const products =
      input.products ??
      listings.map((listingId, index) => ({
        listingId,
        livePrice: 0,
        stock: 1,
        isPinned: index === 0,
      }));

    const session = await apiFetch<LiveSession>('/live/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        department: input.department,
        description: input.description,
        featuredListingIds: listings,
        products,
        scheduledAt: input.scheduledAt,
      }),
    });
    setSessions((current) => [session, ...current]);
    if (session.status === 'live') {
      setActiveBroadcastId(session.id);
      if (prepareModerators.length > 0) {
        setModeratorsBySession((current) => ({ ...current, [session.id]: [...prepareModerators] }));
      }
    }
    return session;
  }, [prepareModerators]);

  const endLive = useCallback(async (sessionId: string) => {
    await apiFetch(`/live/sessions/${sessionId}/end`, { method: 'POST' });
    setSessions((current) =>
      current.map((session) => (session.id === sessionId ? { ...session, status: 'ended' } : session)),
    );
    setConnections((current) => ({ ...current, [sessionId]: 'ended' }));
    setActiveBroadcastId((current) => (current === sessionId ? null : current));
  }, []);

  const getModerators = useCallback(
    (sessionId?: string) => {
      if (sessionId) return moderatorsBySession[sessionId] ?? [];
      return prepareModerators;
    },
    [moderatorsBySession, prepareModerators],
  );

  const addPrepareModerator = useCallback((username: string) => {
    setPrepareModerators((current) => {
      if (current.includes(username) || current.length >= MAX_LIVE_MODERATORS) return current;
      return [...current, username];
    });
  }, []);

  const removePrepareModerator = useCallback((username: string) => {
    setPrepareModerators((current) => current.filter((item) => item !== username));
  }, []);

  const addSessionModerator = useCallback((sessionId: string, username: string) => {
    setModeratorsBySession((current) => {
      const list = current[sessionId] ?? [];
      if (list.includes(username) || list.length >= MAX_LIVE_MODERATORS) return current;
      return { ...current, [sessionId]: [...list, username] };
    });
  }, []);

  const removeSessionModerator = useCallback((sessionId: string, username: string) => {
    setModeratorsBySession((current) => ({
      ...current,
      [sessionId]: (current[sessionId] ?? []).filter((item) => item !== username),
    }));
  }, []);

  const isModerator = useCallback(
    (sessionId: string | undefined, username: string) => {
      const list = sessionId ? moderatorsBySession[sessionId] ?? [] : prepareModerators;
      return list.includes(username);
    },
    [moderatorsBySession, prepareModerators],
  );

  const value = useMemo(
    () => ({
      sessions,
      activeBroadcastId,
      liveNow,
      upcoming,
      loading,
      roomNotice,
      refresh,
      hydrateSession,
      getSession,
      getProducts,
      getPinnedProduct,
      getComments,
      getConnection,
      setConnection,
      getClaim,
      resolveListing,
      listingStatus,
      sendComment,
      removeComment,
      toggleConnection,
      pinProduct,
      pinListing,
      claimProduct,
      claimListing,
      releaseClaim,
      beginCheckoutReservation,
      completeSale,
      releaseListing,
      fetchLiveKitToken,
      startLive,
      endLive,
      subscribeSession,
      prepareModerators,
      getModerators,
      addPrepareModerator,
      removePrepareModerator,
      addSessionModerator,
      removeSessionModerator,
      isModerator,
    }),
    [
      activeBroadcastId,
      beginCheckoutReservation,
      claimListing,
      claimProduct,
      completeSale,
      endLive,
      fetchLiveKitToken,
      getClaim,
      getComments,
      getConnection,
      getPinnedProduct,
      getProducts,
      getSession,
      hydrateSession,
      listingStatus,
      liveNow,
      loading,
      pinListing,
      pinProduct,
      refresh,
      releaseClaim,
      releaseListing,
      removeComment,
      resolveListing,
      roomNotice,
      sendComment,
      sessions,
      setConnection,
      startLive,
      subscribeSession,
      toggleConnection,
      upcoming,
      prepareModerators,
      getModerators,
      addPrepareModerator,
      removePrepareModerator,
      addSessionModerator,
      removeSessionModerator,
      isModerator,
    ],
  );

  return (
    <LiveContext.Provider value={value}>
      <LiveClockContext.Provider value={now}>{children}</LiveClockContext.Provider>
    </LiveContext.Provider>
  );
}

export function useLive() {
  const value = useContext(LiveContext);
  if (!value) throw new Error('useLive must be used within LiveProvider');
  return value;
}

/** 1s clock for claim/checkout countdowns — kept off the main live context so video views don't remount. */
export function useLiveClock() {
  return useContext(LiveClockContext);
}
