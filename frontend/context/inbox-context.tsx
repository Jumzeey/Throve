import { apiFetch } from '@/lib/api';
import { Palette } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import type { ChatMessage, Conversation, Offer, OfferStatus } from '@/data/types';
import { parseMessageTone } from '@/lib/message-tones';
import { playMessageTone } from '@/lib/play-message-tone';
import { supabase } from '@/lib/supabase';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  /** Keep a conversation hot: realtime + light poll while the chat screen is open. */
  subscribeConversation: (convId: string) => () => void;
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
  counterOffer: (id: string, amount: number, username: string) => Promise<boolean>;
  reportChat: (input: {
    kind: 'user' | 'message';
    targetUsername: string;
    conversationId?: string;
    messageId?: string;
  }) => Promise<boolean>;
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

function mergeMessages(existing: ChatMessage[] | undefined, next: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  for (const item of existing ?? []) byId.set(item.id, item);
  for (const item of next) {
    const prev = byId.get(item.id);
    byId.set(item.id, prev ? { ...prev, ...item } : item);
  }
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}

function previewFor(message: Pick<ChatMessage, 'text' | 'imageUrl'>) {
  const trimmed = message.text?.trim() ?? '';
  if (trimmed) return trimmed;
  if (message.imageUrl) return 'Sent a photo';
  return '';
}

export function InboxProvider({ children }: { children: ReactNode }) {
  const { session, isReady } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({});
  const [offers, setOffers] = useState<Offer[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const activeChatRef = useRef<string | null>(null);
  const usernameRef = useRef(session?.username ?? '');
  const sessionRef = useRef(session);
  const channelsRef = useRef<Record<string, RealtimeChannel>>({});
  const inboxChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    usernameRef.current = session?.username ?? '';
    sessionRef.current = session;
  }, [session]);

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

  const loadMessages = useCallback(async (convId: string, ack: 'none' | 'delivered' | 'read' = 'none') => {
    const query = ack === 'none' ? '' : `?ack=${ack}`;
    const data = await apiFetch<ChatMessage[]>(`/inbox/conversations/${convId}/messages${query}`);
    setMessagesByConv((current) => ({ ...current, [convId]: mergeMessages(current[convId], data) }));
    return data;
  }, []);

  const ackReceipt = useCallback(async (convId: string, level: 'delivered' | 'read') => {
    try {
      const data = await apiFetch<ChatMessage[]>(`/inbox/conversations/${convId}/receipts`, {
        method: 'POST',
        body: JSON.stringify({ level }),
      });
      setMessagesByConv((current) => ({ ...current, [convId]: mergeMessages(current[convId], data) }));
      if (level === 'read') {
        const me = usernameRef.current;
        setConversations((current) =>
          current.map((item) =>
            item.id === convId ? { ...item, unreadBy: item.unreadBy.filter((user) => user !== me) } : item,
          ),
        );
      }
    } catch {
      /* ignore — next poll/open will catch up */
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
      if (inboxChannelRef.current) {
        void supabase.removeChannel(inboxChannelRef.current);
        inboxChannelRef.current = null;
      }
      return;
    }
    void refresh();
  }, [isReady, session?.userId, refresh, session]);

  // Inbox-wide realtime: new messages + receipt updates across conversations.
  useEffect(() => {
    if (!session?.userId) return;

    if (inboxChannelRef.current) {
      void supabase.removeChannel(inboxChannelRef.current);
      inboxChannelRef.current = null;
    }

    const channel = supabase
      .channel(`inbox:${session.userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const row = payload.new as {
          id?: string;
          conversation_id?: string;
        };
        if (!row.id || !row.conversation_id) return;
        try {
          const data = await apiFetch<ChatMessage[]>(
            `/inbox/conversations/${row.conversation_id}/messages`,
          );
          const message = data.find((item) => item.id === row.id);
          setMessagesByConv((current) => ({
            ...current,
            [row.conversation_id!]: mergeMessages(current[row.conversation_id!], data),
          }));
          if (!message) return;
          const fromMe = message.from === usernameRef.current;
          setConversations((current) => {
            const preview = previewFor(message);
            if (!current.some((item) => item.id === row.conversation_id)) {
              void refresh({ silent: true });
              return current;
            }
            return current
              .map((item) =>
                item.id === row.conversation_id
                  ? {
                      ...item,
                      lastMessage: preview || item.lastMessage,
                      updatedAt: Math.max(item.updatedAt, message.createdAt),
                      unreadBy:
                        fromMe || activeChatRef.current === row.conversation_id
                          ? item.unreadBy.filter((u) => u !== usernameRef.current)
                          : Array.from(new Set([...item.unreadBy, usernameRef.current])),
                    }
                  : item,
              )
              .sort((a, b) => b.updatedAt - a.updatedAt);
          });
          if (!fromMe) {
            const level = activeChatRef.current === row.conversation_id ? 'read' : 'delivered';
            void ackReceipt(row.conversation_id, level);
            const prefs = sessionRef.current;
            if (activeChatRef.current !== row.conversation_id && prefs?.notifMessages !== false) {
              void playMessageTone(parseMessageTone(prefs.notifMessageTone));
            }
          }
        } catch {
          /* ignore */
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const row = payload.new as {
          id?: string;
          conversation_id?: string;
          delivered_at?: string | null;
          read_at?: string | null;
        };
        if (!row.id || !row.conversation_id) return;
        setMessagesByConv((current) => {
          const list = current[row.conversation_id!] ?? [];
          if (!list.some((item) => item.id === row.id)) return current;
          return {
            ...current,
            [row.conversation_id!]: list.map((item) =>
              item.id === row.id
                ? {
                    ...item,
                    deliveredAt: row.delivered_at ? new Date(row.delivered_at).getTime() : item.deliveredAt ?? null,
                    readAt: row.read_at ? new Date(row.read_at).getTime() : item.readAt ?? null,
                  }
                : item,
            ),
          };
        });
      })
      .subscribe();

    inboxChannelRef.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      if (inboxChannelRef.current === channel) inboxChannelRef.current = null;
    };
  }, [ackReceipt, refresh, session?.userId]);

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
      setMessagesByConv((current) => ({
        ...current,
        [convId]: mergeMessages(current[convId], [message]),
      }));
      setConversations((current) =>
        current
          .map((item) =>
            item.id === convId
              ? {
                  ...item,
                  lastMessage: preview,
                  updatedAt: message.createdAt,
                  unreadBy: item.participants.filter((u) => u !== from),
                }
              : item,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt),
      );
      return true;
    },
    [],
  );

  const markRead = useCallback(
    async (convId: string, username: string) => {
      await loadMessages(convId, 'read');
      setConversations((current) =>
        current.map((item) =>
          item.id === convId ? { ...item, unreadBy: item.unreadBy.filter((user) => user !== username) } : item,
        ),
      );
    },
    [loadMessages],
  );

  const subscribeConversation = useCallback(
    (convId: string) => {
      activeChatRef.current = convId;
      void loadMessages(convId, 'read').catch(() => undefined);

      // Backup poll while the thread is open (covers missed realtime events).
      const poll = setInterval(() => {
        void loadMessages(convId, 'none').catch(() => undefined);
      }, 2500);

      if (!channelsRef.current[convId]) {
        const channel = supabase
          .channel(`chat:${convId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
            async () => {
              try {
                // While actively viewing, keep receipts at read for new inbound messages.
                const data = await apiFetch<ChatMessage[]>(`/inbox/conversations/${convId}/messages?ack=read`);
                setMessagesByConv((current) => ({ ...current, [convId]: mergeMessages(current[convId], data) }));
              } catch {
                /* ignore */
              }
            },
          )
          .subscribe();
        channelsRef.current[convId] = channel;
      }

      return () => {
        clearInterval(poll);
        if (activeChatRef.current === convId) activeChatRef.current = null;
        const channel = channelsRef.current[convId];
        if (channel) {
          void supabase.removeChannel(channel);
          delete channelsRef.current[convId];
        }
      };
    },
    [loadMessages],
  );

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
      void refresh({ silent: true }).catch(() => undefined);
      return offer;
    },
    [refresh],
  );

  const acceptOffer = useCallback(async (id: string, _username: string) => {
    const offer = await apiFetch<Offer>(`/inbox/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'accept' }) });
    setOffers((current) => current.map((item) => (item.id === id ? offer : item)));
    void refresh({ silent: true }).catch(() => undefined);
    return true;
  }, [refresh]);

  const rejectOffer = useCallback(async (id: string, _username: string) => {
    const offer = await apiFetch<Offer>(`/inbox/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'reject' }) });
    setOffers((current) => current.map((item) => (item.id === id ? offer : item)));
    void refresh({ silent: true }).catch(() => undefined);
    return true;
  }, [refresh]);

  const withdrawOffer = useCallback(async (id: string, _username: string) => {
    const offer = await apiFetch<Offer>(`/inbox/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ action: 'withdraw' }) });
    setOffers((current) => current.map((item) => (item.id === id ? offer : item)));
    void refresh({ silent: true }).catch(() => undefined);
    return true;
  }, [refresh]);

  const counterOffer = useCallback(async (id: string, amount: number, _username: string) => {
    const offer = await apiFetch<Offer>(`/inbox/offers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'counter', amount }),
    });
    setOffers((current) => current.map((item) => (item.id === id ? offer : item)));
    void refresh({ silent: true }).catch(() => undefined);
    return true;
  }, [refresh]);

  const reportChat = useCallback(
    async (input: {
      kind: 'user' | 'message';
      targetUsername: string;
      conversationId?: string;
      messageId?: string;
    }) => {
      await apiFetch<{ ok: boolean }>('/inbox/reports', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return true;
    },
    [],
  );

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
      subscribeConversation,
      otherParticipant,
      offersFor,
      offersOnListing,
      getOffer,
      createOffer,
      acceptOffer,
      rejectOffer,
      withdrawOffer,
      counterOffer,
      reportChat,
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
      counterOffer,
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
      subscribeConversation,
      toggleBlock,
      withdrawOffer,
      reportChat,
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
