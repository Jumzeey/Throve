import { ModeratorBadge } from '@/components/ui/status-chip';
import {
  ChevronBackIcon,
  CloseIcon,
  EyeIcon,
  MoreHorizontalIcon,
  SendIcon,
  ShieldIcon,
  SpinnerArcIcon,
  UserIcon,
  VideoIcon,
  WifiOffIcon,
} from '@/components/ui/icons';
import { SimulatedStage } from '@/components/ui/simulated-stage';
import { Palette, Radius, Typography } from '@/constants/theme';
import type { LiveConnection, LiveComment, LiveKitCredentials } from '@/data/types';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

type Props = {
  credentials: LiveKitCredentials | null;
  isHost: boolean;
  onConnectionChange?: (state: LiveConnection) => void;
  children?: ReactNode;
};

type LiveKitModule = typeof import('@livekit/react-native');
type LivekitClient = typeof import('livekit-client');

const LIVE_IVORY_60 = 'rgba(255,247,240,0.6)';
const LIVE_IVORY_62 = 'rgba(255,247,240,0.62)';
const LIVE_IVORY_16 = 'rgba(255,247,240,0.16)';

function canLoadNativeLiveKit() {
  // Expo Go has no LiveKit / WebRTC native modules — never dynamic-import them there.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false;
  if (Constants.appOwnership === 'expo') return false;
  return true;
}

/**
 * LiveKit video stage. Falls back to SimulatedStage when credentials are missing
 * or native modules are unavailable (Expo Go).
 */
export function LiveStage({ credentials, isHost, onConnectionChange, children }: Props) {
  const [mods, setMods] = useState<{ rn: LiveKitModule; client: LivekitClient } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!credentials?.token || !credentials.url || !canLoadNativeLiveKit()) {
        setFailed(true);
        return;
      }
      try {
        await import('@livekit/react-native-webrtc');
        const rn = await import('@livekit/react-native');
        const client = await import('livekit-client');
        rn.registerGlobals();
        if (!cancelled) setMods({ rn, client });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [credentials?.token, credentials?.url]);

  if (failed || !credentials) {
    return <SimulatedStage>{children}</SimulatedStage>;
  }

  if (!mods) {
    return (
      <View style={styles.placeholder}>
        <VideoIcon size={34} color="rgba(255,247,240,0.28)" />
        <Text style={styles.placeholderText}>Connecting stream…</Text>
        <View style={styles.overlay} pointerEvents="box-none">
          {children}
        </View>
      </View>
    );
  }

  const { LiveKitRoom } = mods.rn;

  return (
    <View style={styles.room}>
      <LiveKitRoom
        token={credentials.token}
        serverUrl={credentials.url}
        connect
        audio={isHost}
        video={isHost}
        onConnected={() => onConnectionChange?.('live')}
        onDisconnected={() => onConnectionChange?.('lost')}
        onError={() => onConnectionChange?.('reconnecting')}
      >
        <View style={styles.room}>
          <CameraLayer rn={mods.rn} client={mods.client} isHost={isHost} />
          <View style={styles.overlay} pointerEvents="box-none">
            {children}
          </View>
        </View>
      </LiveKitRoom>
    </View>
  );
}

function CameraLayer({
  rn,
  client,
  isHost,
}: {
  rn: LiveKitModule;
  client: LivekitClient;
  isHost: boolean;
}) {
  const { VideoTrack, useTracks } = rn;
  const tracks = useTracks([client.Track.Source.Camera], { onlySubscribed: !isHost });
  const track = tracks[0];

  if (!track) {
    return (
      <View style={styles.placeholder}>
        <VideoIcon size={34} color="rgba(255,247,240,0.28)" />
        <Text style={styles.placeholderLabel}>{isHost ? 'YOUR CAMERA' : 'LIVE VIDEO'}</Text>
        <Text style={styles.placeholderText}>{isHost ? 'Enable camera' : 'Waiting for host…'}</Text>
      </View>
    );
  }

  return <VideoTrack trackRef={track} style={styles.video} objectFit="cover" />;
}

export function LiveBadgeRow({ viewers }: { viewers?: number }) {
  return (
    <View style={styles.badgeRow}>
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>
      {viewers != null ? (
        <View style={styles.viewerBadge}>
          <EyeIcon size={12} />
          <Text style={styles.viewerText}>{viewers}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function LiveIconButton({ onPress, children }: { onPress?: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton} hitSlop={8}>
      {children}
    </Pressable>
  );
}

export function LiveHostChip({
  host,
  subtitle,
  onPress,
}: {
  host: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.hostChip}>
      <View style={styles.hostAvatar}>
        <UserIcon size={17} color={Palette.muted3} />
      </View>
      <View>
        <Text style={styles.hostName}>@{host}</Text>
        {subtitle ? <Text style={styles.hostSub}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

export function LiveCommentRow({
  comment,
  isModerator,
  onLongPress,
  showActions,
  onRemove,
}: {
  comment: LiveComment;
  isModerator?: boolean;
  onLongPress?: () => void;
  showActions?: boolean;
  onRemove?: () => void;
}) {
  return (
    <View style={styles.commentRow}>
      <View style={styles.commentAvatar}>
        <UserIcon size={12} color={Palette.muted3} />
      </View>
      <Pressable style={styles.commentBody} onLongPress={onLongPress}>
        <View style={styles.commentLine}>
          <Text style={styles.commentUser}>{comment.user}</Text>
          {isModerator ? <ModeratorBadge /> : null}
          <Text style={styles.commentText}> {comment.text}</Text>
        </View>
      </Pressable>
      {showActions && onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8}>
          <Text style={styles.removeLabel}>remove</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function LiveComposer({
  value,
  onChangeText,
  onSend,
  placeholder = 'Add a comment…',
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.composer}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={LIVE_IVORY_60}
        style={styles.composerInput}
        returnKeyType="send"
        onSubmitEditing={onSend}
      />
      <Pressable onPress={onSend} style={styles.sendButton}>
        <SendIcon />
      </Pressable>
    </View>
  );
}

export function LiveConnectionOverlay({
  connection,
  onLeave,
  onOpenProfile,
  host,
}: {
  connection: LiveConnection;
  onLeave?: () => void;
  onOpenProfile?: () => void;
  host?: string;
}) {
  if (connection !== 'lost' && connection !== 'reconnecting' && connection !== 'ended') return null;

  if (connection === 'ended') {
    return (
      <View style={styles.connectionOverlay}>
        <Text style={styles.connectionTitle}>Session ended</Text>
        <View style={styles.connectionActions}>
          {onLeave ? (
            <Pressable onPress={onLeave} style={styles.connectionBtn}>
              <Text style={styles.connectionBtnLabel}>Live discovery</Text>
            </Pressable>
          ) : null}
          {onOpenProfile && host ? (
            <Pressable onPress={onOpenProfile} style={styles.connectionBtn}>
              <Text style={styles.connectionBtnLabel}>Seller profile</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.connectionOverlay}>
      <WifiOffIcon size={26} color={Palette.blush} />
      <Text style={styles.connectionTitle}>
        {connection === 'reconnecting' ? 'Connection lost — reconnecting…' : 'Connection lost — reconnecting…'}
      </Text>
      <Text style={styles.connectionCopy}>
        {onLeave
          ? "If we can't reconnect we'll take you back to Live discovery or the seller's profile."
          : 'Stay on this screen while we try to reconnect.'}
      </Text>
      {onLeave ? (
        <View style={styles.connectionActions}>
          <Pressable onPress={onLeave} style={styles.connectionBtn}>
            <Text style={styles.connectionBtnLabel}>Live discovery</Text>
          </Pressable>
          {onOpenProfile && host ? (
            <Pressable onPress={onOpenProfile} style={styles.connectionBtn}>
              <Text style={styles.connectionBtnLabel}>Seller profile</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function LiveCommentActionsSheet({
  visible,
  comment,
  onClose,
  onRemove,
}: {
  visible: boolean;
  comment: LiveComment | null;
  onClose: () => void;
  onRemove?: () => void;
}) {
  if (!comment) return null;

  const actions = [
    { label: 'Pin comment', destructive: false, onPress: onClose },
    { label: 'Remove comment', destructive: true, onPress: () => { onRemove?.(); onClose(); } },
    { label: 'Mute viewer', destructive: true, onPress: onClose },
    { label: 'Remove viewer from live', destructive: true, onPress: onClose },
    { label: 'Report to Throve', destructive: true, onPress: onClose },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={styles.sheetCard} onStartShouldSetResponder={() => true}>
          <Text style={styles.sheetTitle}>Comment actions</Text>
          <View style={styles.sheetPreview}>
            <Text style={styles.sheetPreviewText}>
              {comment.user} · {comment.text}
            </Text>
          </View>
          {actions.map((action, index) => (
            <View key={action.label}>
              {index > 0 ? <View style={styles.sheetDivider} /> : null}
              <Pressable onPress={action.onPress} style={styles.sheetAction}>
                <Text style={[styles.sheetActionLabel, action.destructive && styles.sheetActionDanger]}>
                  {action.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

export function EndLiveDialog({
  visible,
  onCancel,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.dialogOverlay} onPress={onCancel}>
        <View style={styles.dialogCard} onStartShouldSetResponder={() => true}>
          <Text style={styles.dialogTitle}>End this live?</Text>
          <Text style={styles.dialogBody}>
            Your viewers will leave the session and the broadcast will stop. Any completed sales are unaffected.
          </Text>
          <View style={styles.dialogActions}>
            <Pressable onPress={onCancel} style={styles.dialogBtnSecondary}>
              <Text style={styles.dialogBtnSecondaryLabel}>Keep going</Text>
            </Pressable>
            <Pressable onPress={onConfirm} disabled={loading} style={styles.dialogBtnDanger}>
              {loading ? (
                <SpinnerArcIcon size={16} color={Palette.ivory} />
              ) : (
                <Text style={styles.dialogBtnDangerLabel}>End live</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

export function LiveHostTopBar({
  viewers,
  onEnd,
  onModeration,
}: {
  viewers?: number;
  onEnd: () => void;
  onModeration?: () => void;
}) {
  return (
    <View style={styles.hostTopBar}>
      <LiveBadgeRow viewers={viewers} />
      <View style={styles.hostTopSpacer} />
      {onModeration ? (
        <LiveIconButton onPress={onModeration}>
          <ShieldIcon size={16} />
        </LiveIconButton>
      ) : null}
      <Pressable onPress={onEnd} style={styles.endLiveBtn}>
        <Text style={styles.endLiveLabel}>End live</Text>
      </Pressable>
    </View>
  );
}

export function LiveViewerTopBar({
  viewers,
  onClose,
  onMore,
}: {
  viewers?: number;
  onClose: () => void;
  onMore?: () => void;
}) {
  return (
    <View style={styles.hostTopBar}>
      <LiveIconButton onPress={onClose}>
        <ChevronBackIcon color={Palette.ivory} />
      </LiveIconButton>
      <LiveBadgeRow viewers={viewers} />
      <View style={styles.hostTopSpacer} />
      {onMore ? (
        <LiveIconButton onPress={onMore}>
          <MoreHorizontalIcon />
        </LiveIconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  room: {
    flex: 1,
    backgroundColor: Palette.liveDarkAlt,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.liveDarkAlt,
    gap: 10,
  },
  placeholderLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: 'rgba(255,247,240,0.34)',
    fontFamily: Typography.bodySemiBold,
  },
  placeholderText: {
    color: LIVE_IVORY_60,
    fontFamily: Typography.body,
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    backgroundColor: Palette.liveRed,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: Palette.ivory,
    fontSize: 10,
    fontFamily: Typography.bodyBold,
    letterSpacing: 1,
  },
  viewerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(27,17,19,0.55)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 4,
  },
  viewerText: {
    color: Palette.ivory,
    fontSize: 10.5,
    fontFamily: Typography.bodySemiBold,
    fontVariant: ['tabular-nums'],
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(27,17,19,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(27,17,19,0.5)',
    borderWidth: 1,
    borderColor: LIVE_IVORY_16,
    borderRadius: 26,
    paddingVertical: 6,
    paddingRight: 14,
    paddingLeft: 6,
  },
  hostAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.border,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostName: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  hostSub: {
    marginTop: 2,
    fontSize: 10.5,
    fontFamily: Typography.body,
    color: 'rgba(255,247,240,0.66)',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  commentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.border,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentBody: {
    flex: 1,
  },
  commentLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  commentText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  commentUser: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.bodySemiBold,
    color: LIVE_IVORY_62,
  },
  removeLabel: {
    fontSize: 11,
    color: 'rgba(255,247,240,0.45)',
    fontFamily: Typography.body,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.28)',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 13,
    fontFamily: Typography.body,
    color: Palette.ivory,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.plum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Palette.liveOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  connectionTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
    textAlign: 'center',
  },
  connectionCopy: {
    fontSize: 11.5,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: LIVE_IVORY_60,
    textAlign: 'center',
    maxWidth: 280,
  },
  connectionActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 4,
  },
  connectionBtn: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.35)',
    borderRadius: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionBtnLabel: {
    fontSize: 12.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27,17,19,0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: Palette.ivory,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontSize: 12,
    fontFamily: Typography.bodySemiBold,
    color: Palette.muted2,
    marginBottom: 10,
  },
  sheetPreview: {
    backgroundColor: Palette.ivoryElevated,
    borderWidth: 1,
    borderColor: Palette.accent200,
    borderRadius: Radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 10,
  },
  sheetPreviewText: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Palette.divider,
  },
  sheetAction: {
    paddingVertical: 10,
  },
  sheetActionLabel: {
    fontSize: 12.5,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  sheetActionDanger: {
    color: Palette.error,
    fontFamily: Typography.bodySemiBold,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(27,17,19,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Palette.ivory,
    borderWidth: 1,
    borderColor: Palette.errorBorder,
    borderRadius: Radius.lg,
    padding: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontFamily: Typography.display,
    color: Palette.error,
  },
  dialogBody: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 20,
    fontFamily: Typography.body,
    color: Palette.body,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 13,
  },
  dialogBtnSecondary: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnSecondaryLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.body,
  },
  dialogBtnDanger: {
    flex: 1,
    minHeight: 44,
    backgroundColor: Palette.error,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnDangerLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  hostTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  hostTopSpacer: {
    flex: 1,
  },
  endLiveBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.4)',
    borderRadius: 17,
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endLiveLabel: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
});
