import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import type { AppNotification } from '@/data/types';
import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

type NotificationsContextValue = {
  items: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

async function registerPushToken() {
  if (Platform.OS === 'web') return;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Throve',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const existing = await Notifications.getPermissionsAsync();
    const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;

    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
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
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    if (!isReady || !session) return;
    void refresh();
    void registerPushToken();
  }, [isReady, refresh, session]);

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
