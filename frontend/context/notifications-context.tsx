import { apiFetch } from '@/lib/api';
import { ensureLiveNotificationChannel } from '@/lib/saved-live-reminders';
import { useAuth } from '@/context/auth-context';
import type { AppNotification } from '@/data/types';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

type NotificationsContextValue = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function pushProjectId() {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

function pathFromPushData(data: Record<string, unknown> | undefined) {
  const deepLink = String(data?.deepLink ?? '').replace(/^\//, '');
  if (deepLink) return `/${deepLink}`;
  const sessionId = String(data?.sessionId ?? '');
  if (sessionId) return `/live/${sessionId}`;
  return null;
}

async function registerPushToken() {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    await ensureLiveNotificationChannel();
    const existing = await Notifications.getPermissionsAsync();
    const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const projectId = pushProjectId();
    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const token = tokenResponse.data;
    if (!token) return;
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    await apiFetch('/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  } catch (err) {
    console.warn('[push] register skipped', err instanceof Error ? err.message : err);
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session, isReady } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const handledResponse = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await apiFetch<AppNotification[]>('/notifications');
      setItems(Array.isArray(rows) ? rows : []);
    } catch {
      /* keep current */
    } finally {
      setLoading(false);
    }
  }, [session]);

  const markRead = useCallback(async (id: string) => {
    setItems((current) =>
      current.map((item) => (item.id === id && !item.readAt ? { ...item, readAt: Date.now() } : item)),
    );
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'POST' });
    } catch {
      /* ignore */
    }
  }, []);

  const openFromPush = useCallback(
    (data: Record<string, unknown> | undefined) => {
      const path = pathFromPushData(data);
      if (!path) return;
      router.push(path as never);
    },
    [router],
  );

  useEffect(() => {
    void ensureLiveNotificationChannel();
  }, []);

  useEffect(() => {
    if (!isReady || !session) return;
    void refresh();
    void registerPushToken();
  }, [isReady, refresh, session]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let received: { remove: () => void } | undefined;
    let response: { remove: () => void } | undefined;
    let cancelled = false;

    void (async () => {
      const Notifications = await import('expo-notifications');
      if (cancelled) return;

      received = Notifications.addNotificationReceivedListener(() => {
        void refresh();
      });
      response = Notifications.addNotificationResponseReceivedListener((event) => {
        const key = event.notification.request.identifier;
        if (handledResponse.current === key) return;
        handledResponse.current = key;
        openFromPush(event.notification.request.content.data as Record<string, unknown>);
        void Notifications.clearLastNotificationResponseAsync?.();
        void refresh();
      });
    })();

    return () => {
      cancelled = true;
      received?.remove();
      response?.remove();
    };
  }, [openFromPush, refresh]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isReady || !session) return;
    let cancelled = false;
    void (async () => {
      const Notifications = await import('expo-notifications');
      const last = await Notifications.getLastNotificationResponseAsync();
      const key = last?.notification.request.identifier;
      if (cancelled || !last || !key || handledResponse.current === key) return;
      handledResponse.current = key;
      openFromPush(last.notification.request.content.data as Record<string, unknown>);
      await Notifications.clearLastNotificationResponseAsync?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, openFromPush, session]);

  const unreadCount = useMemo(() => items.filter((item) => !item.readAt).length, [items]);

  const value = useMemo(
    () => ({ items, unreadCount, loading, refresh, markRead }),
    [items, loading, markRead, refresh, unreadCount],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
