import type { LiveSession } from '@/data/types';
import { MESSAGE_TONES, messageChannelId, messagePushSound } from '@/lib/message-tones';
import { AppState, Platform } from 'react-native';

const LAGOS = 'Africa/Lagos';
const DAY_OF_HOUR = 8;
const TEN_MIN_MS = 10 * 60 * 1000;
const ID_PREFIX = 'saved-live-';

function dayId(sessionId: string) {
  return `${ID_PREFIX}day:${sessionId}`;
}

function tenId(sessionId: string) {
  return `${ID_PREFIX}ten:${sessionId}`;
}

function lagosDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: LAGOS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Nigeria is WAT (UTC+1) with no DST. */
function lagosEightAm(dateKey: string) {
  return new Date(`${dateKey}T${String(DAY_OF_HOUR).padStart(2, '0')}:00:00+01:00`);
}

function parseStart(iso?: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function notificationsModule() {
  if (Platform.OS === 'web') return null;
  return import('expo-notifications');
}

export async function ensureLiveNotificationChannel() {
  const Notifications = await notificationsModule();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const type = String(notification.request.content.data?.type ?? '');
      const hideForegroundMessage = AppState.currentState === 'active' && type === 'message_new';
      return {
        shouldShowAlert: !hideForegroundMessage,
        shouldPlaySound: !hideForegroundMessage,
        shouldSetBadge: true,
        shouldShowBanner: !hideForegroundMessage,
        shouldShowList: true,
      };
    },
  });
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Throve',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('live', {
    name: 'Live reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync('orders', {
    name: 'Orders & payouts',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  await Notifications.setNotificationChannelAsync('offers', {
    name: 'Offers',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  for (const tone of MESSAGE_TONES) {
    const sound = messagePushSound(tone.id);
    await Notifications.setNotificationChannelAsync(messageChannelId(tone.id), {
      name: tone.id === 'none' ? 'Messages (silent)' : `Messages · ${tone.label}`,
      importance: Notifications.AndroidImportance.HIGH,
      sound: sound ?? undefined,
      enableVibrate: tone.id !== 'none',
      vibrationPattern: tone.id === 'none' ? [0] : [0, 180, 80, 180],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

async function canNotify() {
  const Notifications = await notificationsModule();
  if (!Notifications) return false;
  await ensureLiveNotificationChannel();
  const existing = await Notifications.getPermissionsAsync();
  const granted = existing.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  const maybeExact = Notifications as typeof Notifications & {
    canScheduleExactNotificationsAsync?: () => Promise<boolean>;
    requestExactNotificationPermissionAsync?: () => Promise<boolean>;
  };
  if (typeof maybeExact.canScheduleExactNotificationsAsync === 'function') {
    const exact = await maybeExact.canScheduleExactNotificationsAsync();
    if (!exact && typeof maybeExact.requestExactNotificationPermissionAsync === 'function') {
      await maybeExact.requestExactNotificationPermissionAsync();
    }
  }
  return true;
}

function triggerDate(when: Date, allowImmediate: boolean) {
  if (when.getTime() > Date.now() + 5_000) return when;
  if (allowImmediate) return new Date(Date.now() + 1_500);
  return null;
}

async function scheduleAt(
  identifier: string,
  when: Date,
  title: string,
  body: string,
  sessionId: string,
) {
  const Notifications = await notificationsModule();
  if (!Notifications) return;
  if (when.getTime() <= Date.now() + 200) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title,
      body,
      sound: 'default',
      data: {
        deepLink: `live/${sessionId}`,
        sessionId,
        type: identifier.startsWith(`${ID_PREFIX}day:`) ? 'saved_live_day_of' : 'saved_live_ten_min',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: when,
      channelId: 'live',
    },
  });
}

export async function cancelSavedLiveReminders(sessionId: string) {
  const Notifications = await notificationsModule();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(dayId(sessionId)).catch(() => undefined);
  await Notifications.cancelScheduledNotificationAsync(tenId(sessionId)).catch(() => undefined);
}

export async function scheduleSavedLiveReminders(session: LiveSession) {
  if (Platform.OS === 'web') return;
  if (session.status === 'ended') {
    await cancelSavedLiveReminders(session.id);
    return;
  }
  const start = parseStart(session.scheduledAt);
  if (!start || start.getTime() <= Date.now()) {
    await cancelSavedLiveReminders(session.id);
    return;
  }
  if (!(await canNotify())) return;

  await cancelSavedLiveReminders(session.id);

  const host = session.host ? `@${session.host}` : 'a seller';
  const todayKey = lagosDateKey(new Date());
  const startKey = lagosDateKey(start);
  const dayAt = lagosEightAm(startKey);
  if (dayAt.getTime() < start.getTime()) {
    const dayTrigger = triggerDate(dayAt, startKey === todayKey);
    if (dayTrigger) {
      await scheduleAt(
        dayId(session.id),
        dayTrigger,
        'A saved live is today',
        `${session.title} with ${host}`,
        session.id,
      );
    }
  }

  const tenAt = new Date(start.getTime() - TEN_MIN_MS);
  const tenTrigger = triggerDate(tenAt, tenAt.getTime() <= Date.now() && start.getTime() > Date.now());
  if (tenTrigger) {
    await scheduleAt(
      tenId(session.id),
      tenTrigger,
      'Starting in 10 minutes',
      `${session.title} with ${host}`,
      session.id,
    );
  }
}

export async function syncSavedLiveReminders(sessions: LiveSession[]) {
  const Notifications = await notificationsModule();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const keep = new Set(sessions.map((session) => session.id));
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(ID_PREFIX))
      .filter((item) => {
        const sessionId = item.identifier.split(':')[1];
        return !sessionId || !keep.has(sessionId);
      })
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined)),
  );

  for (const session of sessions) {
    await scheduleSavedLiveReminders(session);
  }
}
