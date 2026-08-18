import { Palette } from '@/constants/theme';
import { OFFER_TTL_MS, SEED_CONVERSATIONS, SEED_MESSAGES, SEED_OFFERS } from '@/data/inbox';
import type { ChatMessage, Conversation, Offer, OfferStatus } from '@/data/types';
import { useListings } from '@/context/listings-context';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type InboxContextValue = {
  conversationsFor: (username: string) => Conversation[];
  getConversation: (id: string) => Conversation | undefined;
  openOrCreateConversation: (withUsername: string, listingId: string, me: string) => Conversation;
  messages: (convId: string) => ChatMessage[];
  sendMessage: (convId: string, from: string, text: string) => boolean;
  markRead: (convId: string, username: string) => void;
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
  }) => Offer | null;
  acceptOffer: (id: string, username: string) => boolean;
  rejectOffer: (id: string, username: string) => boolean;
  withdrawOffer: (id: string, username: string) => boolean;
  isBlocked: (username: string) => boolean;
  toggleBlock: (username: string) => boolean;
  blockedUsers: string[];
  canSellerMessage: (listingId: string, buyer: string, seller: string) => boolean;
};

const InboxContext = createContext<InboxContextValue | null>(null);

function cloneConversations() {
  return SEED_CONVERSATIONS.map((item) => ({ ...item, participants: [...item.participants] as [string, string], unreadBy: [...item.unreadBy] }));
}

function cloneMessages() {
  return Object.fromEntries(Object.entries(SEED_MESSAGES).map(([id, list]) => [id, list.map((message) => ({ ...message }))]));
}

function cloneOffers() {
  return SEED_OFFERS.map((offer) => ({ ...offer }));
}

function withExpiry(offer: Offer, now = Date.now()): Offer {
  if (offer.status === 'pending' && now > offer.expiresAt) {
    return { ...offer, status: 'expired' };
  }
  return offer;
}

export function offerStatusStyle(status: OfferStatus) {
  if (status === 'pending') {
    return { backgroundColor: '#fdf3e3', color: '#8a6112', label: 'Pending' };
  }
  if (status === 'accepted') {
    return { backgroundColor: '#eaf5ea', color: '#2e6b2e', label: 'Accepted' };
  }
  if (status === 'rejected') {
    return { backgroundColor: Palette.chipBg, color: Palette.muted2, label: 'Rejected' };
  }
  if (status === 'withdrawn') {
    return { backgroundColor: Palette.chipBg, color: Palette.muted2, label: 'Withdrawn' };
  }
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
  const { getListing } = useListings();
  const [conversations, setConversations] = useState<Conversation[]>(cloneConversations);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>(cloneMessages);
  const [offers, setOffers] = useState<Offer[]>(cloneOffers);
  const [blocked, setBlocked] = useState<string[]>([]);

  const getConversation = useCallback((id: string) => conversations.find((item) => item.id === id), [conversations]);

  const conversationsFor = useCallback(
    (username: string) =>
      conversations
        .filter((item) => item.participants.includes(username))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  const otherParticipant = useCallback((conv: Conversation, me: string) => {
    return conv.participants[0] === me ? conv.participants[1] : conv.participants[0];
  }, []);

  const openOrCreateConversation = useCallback(
    (withUsername: string, listingId: string, me: string) => {
      const existing = conversations.find(
        (item) =>
          item.listingId === listingId && item.participants.includes(me) && item.participants.includes(withUsername),
      );
      if (existing) return existing;
      const created: Conversation = {
        id: `c-${Date.now()}`,
        listingId,
        participants: [me, withUsername],
        lastMessage: '',
        updatedAt: Date.now(),
        unreadBy: [],
      };
      setConversations((current) => [created, ...current]);
      setMessagesByConv((current) => ({ ...current, [created.id]: [] }));
      return created;
    },
    [conversations],
  );

  const messages = useCallback((convId: string) => messagesByConv[convId] ?? [], [messagesByConv]);

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

  const sendMessage = useCallback(
    (convId: string, from: string, text: string) => {
      const trimmed = text.trim();
      const conv = conversations.find((item) => item.id === convId);
      if (!trimmed || !conv || !conv.participants.includes(from)) return false;
      const other = otherParticipant(conv, from);
      if (blocked.includes(other) || blocked.includes(from)) return false;
      const listing = getListing(conv.listingId);
      if (listing && from === listing.seller) {
        const buyer = other;
        if (!canSellerMessage(conv.listingId, buyer, from)) return false;
      }
      const message: ChatMessage = { id: `m-${Date.now()}`, from, text: trimmed, createdAt: Date.now() };
      setMessagesByConv((current) => ({ ...current, [convId]: [...(current[convId] ?? []), message] }));
      setConversations((current) =>
        current.map((item) =>
          item.id === convId
            ? {
                ...item,
                lastMessage: trimmed,
                updatedAt: message.createdAt,
                unreadBy: item.participants.filter((user) => user !== from),
              }
            : item,
        ),
      );
      return true;
    },
    [blocked, canSellerMessage, conversations, getListing, otherParticipant],
  );

  const markRead = useCallback((convId: string, username: string) => {
    setConversations((current) =>
      current.map((item) =>
        item.id === convId ? { ...item, unreadBy: item.unreadBy.filter((user) => user !== username) } : item,
      ),
    );
  }, []);

  const getOffer = useCallback(
    (id: string) => {
      const offer = offers.find((item) => item.id === id);
      return offer ? withExpiry(offer) : undefined;
    },
    [offers],
  );

  const offersOnListing = useCallback(
    (listingId: string) => offers.filter((item) => item.listingId === listingId).map((item) => withExpiry(item)),
    [offers],
  );

  const offersFor = useCallback(
    (username: string) => {
      const mine = offers.filter((item) => item.buyer === username || item.seller === username).map((item) => withExpiry(item));
      const sent = mine.filter(
        (item) => (item.initiator === 'buyer' && item.buyer === username) || (item.initiator === 'seller' && item.seller === username),
      );
      const received = mine.filter((item) => !sent.includes(item));
      return { received, sent };
    },
    [offers],
  );

  const createOffer = useCallback(
    (input: { listingId: string; buyer: string; seller: string; amount: number; initiator: Offer['initiator'] }) => {
      const listing = getListing(input.listingId);
      if (!listing || listing.status !== 'available') return null;
      const error = validateOfferAmount(input.amount, listing.price);
      if (error) return null;
      const createdAt = Date.now();
      const offer: Offer = {
        id: `o-${createdAt}`,
        listingId: input.listingId,
        buyer: input.buyer,
        seller: input.seller,
        amount: input.amount,
        status: 'pending',
        createdAt,
        expiresAt: createdAt + OFFER_TTL_MS,
        initiator: input.initiator,
      };
      setOffers((current) => [offer, ...current]);
      return offer;
    },
    [getListing],
  );

  const acceptOffer = useCallback(
    (id: string, username: string) => {
      const offer = getOffer(id);
      if (!offer || offer.status !== 'pending' || offer.seller !== username) return false;
      setOffers((current) => current.map((item) => (item.id === id ? { ...item, status: 'accepted' } : item)));
      return true;
    },
    [getOffer],
  );

  const rejectOffer = useCallback(
    (id: string, username: string) => {
      const offer = getOffer(id);
      if (!offer || offer.status !== 'pending' || offer.seller !== username) return false;
      setOffers((current) => current.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item)));
      return true;
    },
    [getOffer],
  );

  const withdrawOffer = useCallback(
    (id: string, username: string) => {
      const offer = getOffer(id);
      if (!offer || offer.status !== 'pending' || offer.buyer !== username) return false;
      setOffers((current) => current.map((item) => (item.id === id ? { ...item, status: 'withdrawn' } : item)));
      return true;
    },
    [getOffer],
  );

  const isBlocked = useCallback((username: string) => blocked.includes(username), [blocked]);

  const toggleBlock = useCallback((username: string) => {
    const already = blocked.includes(username);
    setBlocked((current) => (already ? current.filter((item) => item !== username) : [...current, username]));
    return !already;
  }, [blocked]);

  const value = useMemo(
    () => ({
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
      markRead,
      messages,
      offersFor,
      offersOnListing,
      openOrCreateConversation,
      otherParticipant,
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
  if (!value) {
    throw new Error('useInbox must be used within InboxProvider');
  }
  return value;
}
