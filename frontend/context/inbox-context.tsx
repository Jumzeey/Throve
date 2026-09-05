import { apiFetch } from '@/lib/api';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { ChatMessage, Conversation, Offer, OfferStatus } from '@/data/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type InboxContextValue = {
  loading: boolean;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  conversationsFor: (username: string) => Conversation[];
  getConversation: (id: string) => Conversation | undefined;
  openOrCreateConversation: (withUsername: string, listingId: string, me: string) => Promise<Conversation>;
  messages: (convId: string) => ChatMessage[];
  sendMessage: (
    convId: string,
    from: string,
    text: string,
    imageUrl?: string | null,
  ) => Promise<boolean>;
  markRead: (convId: string, username: string) => Promise<void>;
  otherParticipant: (conv: Conversation, me: string) => string;
  offersFor: (username: string) => { received: Offer[]; sent: Offer[] };
  offersOnListing: (listingId: string) => Offer[];
  getOffer: (id: string) => Offer | undefined;
  createOffer: (input: {
    listingId: string;
    buyer: string;
    seller: string;
    amount: number;
    initiator: Offer['initiator'];
  }) => Promise<Offer | null>;
  acceptOffer: (id: string, username: string) => Promise<boolean>;
  rejectOffer: (id: string, username: string) => Promise<boolean>;
  withdrawOffer: (id: string, username: string) => Promise<boolean>;
  isBlocked: (username: string) => boolean;
  toggleBlock: (username: string) => Promise<boolean>;
  blockedUsers: string[];
  canSellerMessage: (listingId: string, buyer: string, seller: string) => boolean;
};

const InboxContext = createContext<InboxContextValue | null>(null);

export function offerStatusStyle(status: OfferStatus) {
  if (status === 'pending') return { backgroundColor: '#fdf3e3', color: '#8a6112', label: 'Pending' };
  if (status === 'accepted') return { backgroundColor: '#eaf5ea', color: '#2e6b2e', label: 'Accepted' };
  if (status === 'rejected') return { backgroundColor: Palette.chipBg, color: Palette.muted2, label: 'Rejected' };
  if (status === 'withdrawn') return { backgroundColor: Palette.chipBg, color: Palette.muted2, label: 'Withdrawn' };
  return { backgroundColor: Palette.chipBg, color: Palette.muted2, label: 'Expired' };
}

export function minOfferAmount(listingPrice: number) {
  return Math.ceil(listingPrice * 0.5);
}

export function validateOfferAmount(amount: number, listingPrice: number) {
  if (!amount || !Number.isFinite(amount)) return 'Enter a valid amount.';
  const min = minOfferAmount(listingPrice);
  if (amount < min) return `Offer must be at least ₦${min.toLocaleString('en-NG')}.`;
  if (amount >= listingPrice) return 'Offer must be below the listing price.';
  return null;
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const { session, isReady } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [offers, setOffers] = useState<Offer[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const [convos, offerData, blocks] = await Promise.all([
        apiFetch<Conversation[]>('/inbox/conversations'),
        apiFetch<{ received: Offer[]; sent: Offer[]; all: Offer[] }>('/inbox/offers'),
        apiFetch<string[]>('/inbox/blocks'),
      ]);
      setConversations(Array.isArray(convos) ? convos : []);
      setOffers(offerData.all ?? [...(offerData.received ?? []), ...(offerData.sent ?? [])]);
      setBlocked(Array.isArray(blocks) ? blocks : []);
    } catch {
      // Keep whatever we already have; the screen can still pull-to-refresh.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    if (!session) {
      setConversations([]);
      setOffers([]);
      setBlocked([]);
      setMessagesByConv({});
      setLoading(false);
      return;
    }
    void refresh();
  }, [isReady, session?.userId, refresh]);

  const getConversation = useCallback((id: string) => conversations.find((item) => item.id === id), [conversations]);

  const conversationsFor = useCallback(
    (_username: string) => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  const otherParticipant = useCallback((conv: Conversation, me: string) => {
    return conv.participants[0] === me ? conv.participants[1] : conv.participants[0];
  }, []);

  const openOrCreateConversation = useCallback(async (withUsername: string, listingId: string, me: string) => {
    const created = await apiFetch<Conversation>('/inbox/conversations', {
      method: 'POST',
      body: JSON.stringify({ withUsername, listingId }),
    });
    setConversations((current) => {
      const existing = current.find((item) => item.id === created.id);
      if (existing) return current;
      return [created, ...current];
    });
    setMessagesByConv((current) => ({ ...current, [created.id]: current[created.id] ?? [] }));
    return created;
  }, []);

  const messages = useCallback((convId: string) => messagesByConv[convId] ?? [], [messagesByConv]);

  const loadMessages = useCallback(async (convId: string) => {
    const data = await apiFetch<ChatMessage[]>(`/inbox/conversations/${convId}/messages`);
    setMessagesByConv((current) => ({ ...current, [convId]: data }));
    return data;
  }, []);

  const sendMessage = useCallback(
    async (convId: string, from: string, text: string, imageUrl?: string | null) => {
      const trimmed = text.trim();
      const image = imageUrl?.trim() || null;
      if (!trimmed && !image) return false;
      const message = await apiFetch<ChatMessage>(`/inbox/conversations/${convId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: trimmed, imageUrl: image }),
      });
      const preview = trimmed || 'Sent a photo';
      setMessagesByConv((current) => ({ ...current, [convId]: [...(current[convId] ?? []), message] }));
      setConversations((current) =>
        current.map((item) =>
          item.id === convId
            ? {
                ...item,
                lastMessage: preview,
                updatedAt: message.createdAt,
                unreadBy: item.participants.filter((u) => u !== from),
              }
            : item,
        ),
      );
      return true;
    },
    [],
  );

  const markRead = useCallback(async (convId: string, username: string) => {
    await loadMessages(convId);
    setConversations((current) =>
      current.map((item) =>
        item.id === convId ? { ...item, unreadBy: item.unreadBy.filter((user) => user !== username) } : item,
      ),
    );
  }, [loadMessages]);

  const getOffer = useCallback((id: string) => offers.find((item) => item.id === id), [offers]);

  const offersOnListing = useCallback((listingId: string) => offers.filter((item) => item.listingId === listingId), [offers]);

  const offersFor = useCallback(
    (username: string) => {
      const mine = offers.filter((item) => item.buyer === username || item.seller === username);
      const sent = mine.filter(
        (item) => (item.initiator === 'buyer' && item.buyer === username) || (item.initiator === 'seller' && item.seller === username),
      );
      const received = mine.filter((item) => !sent.includes(item));
      return { received, sent };
    },
    [offers],
  );

  const createOffer = useCallback(
    async (input: { listingId: string; buyer: string; seller: string; amount: number; initiator: Offer['initiator'] }) => {
      const offer = await apiFetch<Offer>('/inbox/offers', { method: 'POST', body: JSON.stringify(input) });
      setOffers((current) => [offer, ...current]);
      return offer;
    },
    [],
  );

  const acceptOffer = useCallback(async (id: string, _username: string) => {
    const offer = await apiFetch<Offer>(`/inbox/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) });
    setOffers((current) => current.map((item) => (item.id === id ? offer : item)));
    return true;
  }, []);

  const rejectOffer = useCallback(async (id: string, _username: string) => {
    const offer = await apiFetch<Offer>(`/inbox/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'reject' }) });
    setOffers((current) => current.map((item) => (item.id === id ? offer : item)));
    return true;
  }, []);

  const withdrawOffer = useCallback(async (id: string, _username: string) => {
    const offer = await apiFetch<Offer>(`/inbox/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'withdraw' }) });
    setOffers((current) => current.map((item) => (item.id === id ? offer : item)));
    return true;
  }, []);

  const isBlocked = useCallback((username: string) => blocked.includes(username), [blocked]);

  const toggleBlock = useCallback(async (username: string) => {
    const already = blocked.includes(username);
    if (already) {
      await apiFetch(`/inbox/blocks/${encodeURIComponent(username)}`, { method: 'DELETE' });
      setBlocked((current) => current.filter((item) => item !== username));
      return false;
    }
    await apiFetch(`/inbox/blocks/${encodeURIComponent(username)}`, { method: 'POST' });
    setBlocked((current) => [...current, username]);
    return true;
  }, [blocked]);

  const canSellerMessage = useCallback(
    (listingId: string, buyer: string, seller: string) => {
      const conv = conversations.find(
        (item) => item.listingId === listingId && item.participants.includes(buyer) && item.participants.includes(seller),
      );
      if (!conv) return true;
      const list = messagesByConv[conv.id] ?? [];
      if (list.some((message) => message.from === buyer)) return true;
      return !list.some((message) => message.from === seller);
    },
    [conversations, messagesByConv],
  );

  const value = useMemo(
    () => ({
      loading,
      refresh,
      conversationsFor,
      getConversation,
      openOrCreateConversation,
      messages,
      sendMessage,
      markRead,
      otherParticipant,
      offersFor,
      offersOnListing,
      getOffer,
      createOffer,
      acceptOffer,
      rejectOffer,
      withdrawOffer,
      isBlocked,
      toggleBlock,
      blockedUsers: blocked,
      canSellerMessage,
    }),
    [
      acceptOffer,
      blocked,
      canSellerMessage,
      conversationsFor,
      createOffer,
      getConversation,
      getOffer,
      isBlocked,
      loading,
      markRead,
      messages,
      offersFor,
      offersOnListing,
      openOrCreateConversation,
      otherParticipant,
      refresh,
      rejectOffer,
      sendMessage,
      toggleBlock,
      withdrawOffer,
    ],
  );

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  const value = useContext(InboxContext);
  if (!value) throw new Error('useInbox must be used within InboxProvider');
  return value;
}

export async function fetchConversationMessages(convId: string) {
  return apiFetch<ChatMessage[]>(`/inbox/conversations/${convId}/messages`);
}
