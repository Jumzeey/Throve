import { LIVE_COMMENTS, LIVE_SESSIONS, getListing } from '@/data/seed';
import type { Listing, ListingStatus, LiveClaim, LiveComment, LiveConnection, LiveSession } from '@/data/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const CLAIM_MS = 5 * 60 * 1000;
export const CHECKOUT_RESERVE_MS = 10 * 60 * 1000;

type StartLiveInput = {
  host: string;
  title: string;
  department: LiveSession['department'];
  description?: string;
  featuredListingIds: string[];
  scheduledAt?: string;
};

type LiveContextValue = {
  sessions: LiveSession[];
  activeBroadcastId: string | null;
  now: number;
  liveNow: LiveSession[];
  upcoming: LiveSession[];
  getSession: (id: string) => LiveSession | undefined;
  getComments: (sessionId: string) => LiveComment[];
  getConnection: (sessionId: string) => LiveConnection;
  getClaim: (sessionId: string) => LiveClaim | undefined;
  resolveListing: (id?: string) => Listing | undefined;
  listingStatus: (id?: string) => ListingStatus | undefined;
  sendComment: (sessionId: string, user: string, text: string) => void;
  removeComment: (sessionId: string, commentId: string) => void;
  toggleConnection: (sessionId: string) => void;
  pinListing: (sessionId: string, listingId: string) => void;
  claimListing: (sessionId: string, listingId: string, username: string) => void;
  beginCheckoutReservation: (listingId: string, username: string, sessionId: string) => boolean;
  completeSale: (listingId: string) => void;
  releaseListing: (listingId: string) => void;
  startLive: (input: StartLiveInput) => LiveSession;
  endLive: (sessionId: string) => void;
};

const LiveContext = createContext<LiveContextValue | null>(null);

function cloneComments() {
  return Object.fromEntries(Object.entries(LIVE_COMMENTS).map(([id, comments]) => [id, comments.map((comment) => ({ ...comment }))]));
}

export function LiveProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<LiveSession[]>(() => LIVE_SESSIONS.map((session) => ({ ...session })));
  const [commentsBySession, setCommentsBySession] = useState<Record<string, LiveComment[]>>(cloneComments);
  const [connections, setConnections] = useState<Record<string, LiveConnection>>({});
  const [overrides, setOverrides] = useState<Record<string, ListingStatus>>({});
  const [claim, setClaim] = useState<LiveClaim | null>(null);
  const [activeBroadcastId, setActiveBroadcastId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!claim) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [claim]);

  useEffect(() => {
    if (!claim) return;
    if (now < claim.expiresAt) return;
    setOverrides((current) => {
      if (current[claim.listingId] === 'sold') return current;
      const next = { ...current };
      delete next[claim.listingId];
      return next;
    });
    setClaim(null);
  }, [claim, now]);

  const liveNow = useMemo(() => sessions.filter((session) => session.status === 'live'), [sessions]);
  const upcoming = useMemo(() => sessions.filter((session) => session.status === 'upcoming'), [sessions]);

  const getSession = useCallback((id: string) => sessions.find((session) => session.id === id), [sessions]);

  const getComments = useCallback((sessionId: string) => commentsBySession[sessionId] ?? [], [commentsBySession]);

  const getConnection = useCallback(
    (sessionId: string) => {
      const session = sessions.find((item) => item.id === sessionId);
      if (session?.status === 'ended') return 'ended';
      return connections[sessionId] ?? 'live';
    },
    [connections, sessions],
  );

  const getClaim = useCallback(
    (sessionId: string) => (claim?.sessionId === sessionId ? claim : undefined),
    [claim],
  );

  const listingStatus = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      return overrides[id] ?? getListing(id)?.status;
    },
    [overrides],
  );

  const resolveListing = useCallback(
    (id?: string) => {
      if (!id) return undefined;
      const listing = getListing(id);
      if (!listing) return undefined;
      return { ...listing, status: overrides[id] ?? listing.status };
    },
    [overrides],
  );

  const sendComment = useCallback((sessionId: string, user: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const comment: LiveComment = { id: `c-${Date.now()}`, user, text: trimmed };
    setCommentsBySession((current) => ({
      ...current,
      [sessionId]: [...(current[sessionId] ?? []), comment],
    }));
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

  const pinListing = useCallback((sessionId: string, listingId: string) => {
    setSessions((current) =>
      current.map((session) => (session.id === sessionId ? { ...session, pinnedListingId: listingId } : session)),
    );
  }, []);

  const claimListing = useCallback(
    (sessionId: string, listingId: string, username: string) => {
      const listing = resolveListing(listingId);
      if (!listing || listing.status !== 'available') return;
      setOverrides((current) => ({ ...current, [listingId]: 'reserved' }));
      setClaim({ sessionId, listingId, username, expiresAt: Date.now() + CLAIM_MS });
      setNow(Date.now());
    },
    [resolveListing],
  );

  const beginCheckoutReservation = useCallback(
    (listingId: string, username: string, sessionId: string) => {
      const listing = resolveListing(listingId);
      if (!listing) return false;
      const mine = claim?.username === username && claim.listingId === listingId;
      if (listing.status === 'sold') return false;
      if (listing.status === 'reserved' && !mine) return false;
      setOverrides((current) => ({ ...current, [listingId]: 'reserved' }));
      setClaim({ sessionId, listingId, username, expiresAt: Date.now() + CHECKOUT_RESERVE_MS });
      setNow(Date.now());
      return true;
    },
    [claim, resolveListing],
  );

  const completeSale = useCallback((listingId: string) => {
    setOverrides((current) => ({ ...current, [listingId]: 'sold' }));
    setClaim((current) => (current?.listingId === listingId ? null : current));
  }, []);

  const releaseListing = useCallback((listingId: string) => {
    setOverrides((current) => {
      if (current[listingId] === 'sold') return current;
      const next = { ...current };
      delete next[listingId];
      return next;
    });
    setClaim((current) => (current?.listingId === listingId ? null : current));
  }, []);

  const startLive = useCallback((input: StartLiveInput) => {
    const scheduled = Boolean(input.scheduledAt?.trim());
    const session: LiveSession = {
      id: `live-${Date.now()}`,
      host: input.host,
      title: input.title.trim(),
      status: scheduled ? 'upcoming' : 'live',
      viewers: scheduled ? undefined : 1,
      scheduledAt: scheduled ? input.scheduledAt?.trim() : undefined,
      pinnedListingId: input.featuredListingIds[0],
      department: input.department,
      description: input.description?.trim() || undefined,
      featuredListingIds: input.featuredListingIds,
    };
    setSessions((current) => [session, ...current]);
    if (!scheduled) setActiveBroadcastId(session.id);
    return session;
  }, []);

  const endLive = useCallback((sessionId: string) => {
    setSessions((current) => current.map((session) => (session.id === sessionId ? { ...session, status: 'ended' } : session)));
    setConnections((current) => ({ ...current, [sessionId]: 'ended' }));
    setActiveBroadcastId((current) => (current === sessionId ? null : current));
  }, []);

  const value = useMemo(
    () => ({
      sessions,
      activeBroadcastId,
      now,
      liveNow,
      upcoming,
      getSession,
      getComments,
      getConnection,
      getClaim,
      resolveListing,
      listingStatus,
      sendComment,
      removeComment,
      toggleConnection,
      pinListing,
      claimListing,
      beginCheckoutReservation,
      completeSale,
      releaseListing,
      startLive,
      endLive,
    }),
    [
      activeBroadcastId,
      beginCheckoutReservation,
      claimListing,
      completeSale,
      endLive,
      getClaim,
      getComments,
      getConnection,
      getSession,
      listingStatus,
      liveNow,
      now,
      pinListing,
      releaseListing,
      removeComment,
      resolveListing,
      sendComment,
      sessions,
      startLive,
      toggleConnection,
      upcoming,
    ],
  );

  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive() {
  const value = useContext(LiveContext);
  if (!value) {
    throw new Error('useLive must be used within LiveProvider');
  }
  return value;
}
