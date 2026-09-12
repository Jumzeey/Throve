import { ModeratorBadge } from '@/components/ui/status-chip';
import { AppImage } from '@/components/ui/app-image';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import {
  ChevronBackIcon,
  CloseIcon,
  EyeIcon,
  MoreHorizontalIcon,
  SendIcon,
  CameraSwitchIcon,
  ShieldIcon,
  SpinnerArcIcon,
  UserIcon,
  VideoIcon,
  WifiOffIcon,
} from '@/components/ui/icons';
import { SimulatedStage } from '@/components/ui/simulated-stage';
import { LiveWatchersSheet } from '@/components/live/watchers-sheet';
import { Palette, Radius, Typography } from '@/constants/theme';
import type { LiveConnection, LiveComment, LiveMediaCredentials } from '@/data/types';
import { loadLiveKitNative, resetLiveKitNativeLoad, getLiveKitLoadFailure, getLiveKitLoadFailureDetail, type LiveKitNative } from '@/lib/livekit-native';
import {
  getLiveKitRoomOptions,
  loadLiveVideoProfileOverride,
  logLiveVideoProfile,
  resolveLiveVideoProfile,
  type LiveVideoProfileResolution,
} from '@/lib/live-video-profile';
import { useScreenInsets } from '@/hooks/use-screen-insets';
import { createContext, memo, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useKeyboardInset } from '@/hooks/use-keyboard-bottom-inset';
import * as Device from 'expo-device';

type Props = {
  credentials: LiveMediaCredentials | null;
  isHost: boolean;
  /** When credentials are still null: loading vs hard media failure. */
  mediaStatus?: 'loading' | 'ready' | 'error';
  mediaErrorMessage?: string | null;
  onConnectionChange?: (state: LiveConnection) => void;
  children?: ReactNode;
};

type LiveKitModule = typeof import('@livekit/react-native');
type LivekitClient = typeof import('livekit-client');
type CameraFacing = 'user' | 'environment';

type HostCameraApi = {
  ready: boolean;
  switching: boolean;
  facing: CameraFacing;
  switchCamera: () => void;
};

const idleCamera: HostCameraApi = {
  ready: false,
  switching: false,
  facing: 'user',
  switchCamera: () => {},
};

const HostCameraContext = createContext<HostCameraApi>(idleCamera);

function useHostCamera() {
  return useContext(HostCameraContext);
}

const LIVE_IVORY_60 = 'rgba(255,247,240,0.6)';
const LIVE_IVORY_62 = 'rgba(255,247,240,0.62)';
const LIVE_IVORY_16 = 'rgba(255,247,240,0.16)';

/**
 * Media stage adapter. LiveKit today; IVS later; SimulatedStage only for explicit simulated provider.
 */
export function LiveStage({
  credentials,
  isHost,
  mediaStatus = 'loading',
  mediaErrorMessage,
  onConnectionChange,
  children,
}: Props) {
  const [camera, setCamera] = useState<HostCameraApi>(idleCamera);
  return (
    <HostCameraContext.Provider value={camera}>
      <View style={styles.room}>
        <LiveVideoLayer
          credentials={credentials}
          isHost={isHost}
          mediaStatus={mediaStatus}
          mediaErrorMessage={mediaErrorMessage}
          onConnectionChange={onConnectionChange}
          onCameraApi={setCamera}
        />
        <View style={styles.overlay} pointerEvents="box-none">
          {children}
        </View>
      </View>
    </HostCameraContext.Provider>
  );
}

function MediaUnavailableStage({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.videoLayer}>
      <SimulatedStage>
        <View style={styles.mediaErrorCard}>
          <WifiOffIcon size={28} color="rgba(255,247,240,0.7)" />
          <Text style={styles.mediaErrorTitle}>{title}</Text>
          <Text style={styles.mediaErrorCopy}>{message}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} style={styles.mediaRetryBtn} hitSlop={8}>
              <Text style={styles.mediaRetryLabel}>Try again</Text>
            </Pressable>
          ) : null}
        </View>
      </SimulatedStage>
    </View>
  );
}

function ConnectingStage({ label }: { label: string }) {
  return (
    <View style={styles.placeholder}>
      <VideoIcon size={34} color="rgba(255,247,240,0.28)" />
      <Text style={styles.placeholderText}>{label}</Text>
    </View>
  );
}

const LiveVideoLayer = memo(function LiveVideoLayer({
  credentials,
  isHost,
  mediaStatus,
  mediaErrorMessage,
  onConnectionChange,
  onCameraApi,
}: {
  credentials: LiveMediaCredentials | null;
  isHost: boolean;
  mediaStatus: 'loading' | 'ready' | 'error';
  mediaErrorMessage?: string | null;
  onConnectionChange?: (state: LiveConnection) => void;
  onCameraApi?: (api: HostCameraApi) => void;
}) {
  useEffect(() => {
    if (!isHost) onCameraApi?.(idleCamera);
  }, [isHost, onCameraApi]);

  if (!credentials) {
    if (mediaStatus === 'error') {
      return (
        <MediaUnavailableStage
          title={isHost ? 'Camera unavailable' : 'Stream unavailable'}
          message={mediaErrorMessage ?? 'Could not start live media. Check your connection and try again.'}
        />
      );
    }
    return (
      <ConnectingStage label={isHost ? 'Getting stream credentials…' : 'Connecting stream…'} />
    );
  }

  const provider = credentials.provider ?? 'livekit';

  if (provider === 'simulated') {
    return (
      <MediaUnavailableStage
        title="Preview mode"
        message="Live media is running in simulated mode — camera and mic are not connected."
      />
    );
  }

  if (provider === 'ivs') {
    return <IvsVideoLayer credentials={credentials} isHost={isHost} onConnectionChange={onConnectionChange} />;
  }

  return (
    <LiveKitVideoLayer
      credentials={credentials}
      isHost={isHost}
      onConnectionChange={onConnectionChange}
      onCameraApi={onCameraApi}
    />
  );
});

const IvsVideoLayer = memo(function IvsVideoLayer({
  credentials,
  isHost,
  onConnectionChange,
}: {
  credentials: LiveMediaCredentials;
  isHost: boolean;
  onConnectionChange?: (state: LiveConnection) => void;
}) {
  const [ready, setReady] = useState(false);
  const [av, setAv] = useState<typeof import('expo-av') | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('expo-av');
        if (!cancelled) setAv(mod);
      } catch {
        if (!cancelled) setAv(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isHost) {
      onConnectionChange?.('live');
      return;
    }
    if (credentials.playbackUrl) onConnectionChange?.('live');
  }, [credentials.playbackUrl, isHost, onConnectionChange]);

  if (isHost) {
    return (
      <View style={styles.videoLayer}>
        <SimulatedStage />
        <View style={styles.ivsHostBanner} pointerEvents="none">
          <Text style={styles.ivsHostTitle}>IVS host ingest</Text>
          <Text style={styles.ivsHostCopy}>
            Broadcast with OBS to RTMPS. In-app camera publish for IVS needs the native broadcast SDK next.
          </Text>
          {credentials.ingestEndpoint ? (
            <Text style={styles.ivsHostMeta} numberOfLines={2}>
              {credentials.rtmpsUrl || `rtmps://${credentials.ingestEndpoint}:443/app/`}
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (!credentials.playbackUrl || !av) {
    return (
      <View style={styles.videoLayer}>
        <SimulatedStage />
        {!credentials.playbackUrl ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>Waiting for stream…</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const { Video, ResizeMode } = av;

  return (
    <View style={styles.videoLayer} pointerEvents="none">
      <Video
        style={StyleSheet.absoluteFill}
        source={{ uri: credentials.playbackUrl }}
        useNativeControls={false}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onReadyForDisplay={() => {
          setReady(true);
          onConnectionChange?.('live');
        }}
        onError={() => onConnectionChange?.('reconnecting')}
      />
      {!ready ? (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Connecting stream…</Text>
        </View>
      ) : null}
    </View>
  );
});

const LiveKitVideoLayer = memo(function LiveKitVideoLayer({
  credentials,
  isHost,
  onConnectionChange,
  onCameraApi,
}: {
  credentials: LiveMediaCredentials;
  isHost: boolean;
  onConnectionChange?: (state: LiveConnection) => void;
  onCameraApi?: (api: HostCameraApi) => void;
}) {
  const [mods, setMods] = useState<LiveKitNative | null>(null);
  const [failed, setFailed] = useState(false);
  const [failureReason, setFailureReason] = useState<'expo_go' | 'failed' | null>(null);
  const [failureDetail, setFailureDetail] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const profileLoggedRef = useRef(false);
  const [videoProfile, setVideoProfile] = useState<{
    totalMemoryBytes: number | null;
    resolution: LiveVideoProfileResolution;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadLiveVideoProfileOverride();
      if (cancelled) return;
      let totalMemoryBytes: number | null = null;
      if (Platform.OS === 'android') {
        const mem = Device.totalMemory;
        if (mem != null && Number.isFinite(mem) && mem > 0) {
          totalMemoryBytes = mem;
        }
      }
      setVideoProfile({
        totalMemoryBytes,
        resolution: getLiveKitRoomOptions({
          platform: Platform.OS,
          profile: resolveLiveVideoProfile(),
          totalMemoryBytes,
        }),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!credentials.token || !credentials.url) {
        setFailed(true);
        setFailureReason('failed');
        setFailureDetail('Missing LiveKit token or server URL from the backend.');
        return;
      }
      const loaded = await loadLiveKitNative();
      if (cancelled) return;
      if (!loaded) {
        setFailed(true);
        setFailureReason(getLiveKitLoadFailure() ?? 'failed');
        setFailureDetail(getLiveKitLoadFailureDetail());
        return;
      }
      setFailed(false);
      setFailureReason(null);
      setFailureDetail(null);
      setMods(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, [credentials.token, credentials.url, retryKey]);

  const onConnected = useCallback(() => {
    if (isHost && videoProfile && !profileLoggedRef.current) {
      profileLoggedRef.current = true;
      logLiveVideoProfile(videoProfile.resolution, videoProfile.totalMemoryBytes);
    }
    onConnectionChange?.('live');
  }, [isHost, onConnectionChange, videoProfile]);
  const onDisconnected = useCallback(() => onConnectionChange?.('lost'), [onConnectionChange]);
  const onError = useCallback(
    (err?: unknown) => {
      console.warn('[livekit] room error', err);
      onConnectionChange?.('reconnecting');
    },
    [onConnectionChange],
  );

  const retryNative = useCallback(() => {
    resetLiveKitNativeLoad();
    setMods(null);
    setFailed(false);
    setFailureReason(null);
    setFailureDetail(null);
    setRetryKey((n) => n + 1);
  }, []);

  if (failed) {
    const expoGo = failureReason === 'expo_go';
    const detail = failureDetail?.trim();
    const isShimCrash = /Super expression must either be null or a function/i.test(detail ?? '');
    return (
      <MediaUnavailableStage
        title={
          expoGo
            ? 'Needs Throve app build'
            : isShimCrash
              ? 'Live build needs update'
              : isHost
                ? 'Camera failed to start'
                : 'Could not join stream'
        }
        message={
          expoGo
            ? 'Camera and mic need a development or release build of Throve. Expo Go cannot run LiveKit WebRTC — install the Codemagic/APK build and open that instead.'
            : isShimCrash
              ? 'WebRTC failed to initialize in this app binary. Install the latest Codemagic build (shim fix), then try again.'
              : isHost
                ? detail
                  ? `LiveKit could not start: ${detail}`
                  : 'LiveKit could not open your camera or microphone. Close other apps using the camera, check permissions, and try again.'
                : detail
                  ? `Could not join: ${detail}`
                  : 'The live video connection could not be established.'
        }
        onRetry={expoGo ? undefined : retryNative}
      />
    );
  }

  if (!mods || !videoProfile) {
    return <ConnectingStage label={isHost ? 'Starting camera…' : 'Joining stream…'} />;
  }

  const { LiveKitRoom } = mods.rn;

  return (
    <View style={styles.videoLayer} pointerEvents="none">
      <LiveKitRoom
        token={credentials.token!}
        serverUrl={credentials.url!}
        connect
        audio={isHost}
        video={isHost}
        options={videoProfile.resolution.roomOptions}
        onConnected={onConnected}
        onDisconnected={onDisconnected}
        onError={onError}
      >
        <CameraLayer
          rn={mods.rn}
          client={mods.client}
          isHost={isHost}
          onCameraApi={onCameraApi}
        />
      </LiveKitRoom>
    </View>
  );
});

function CameraLayer({
  rn,
  client,
  isHost,
  onCameraApi,
}: {
  rn: LiveKitModule;
  client: LivekitClient;
  isHost: boolean;
  onCameraApi?: (api: HostCameraApi) => void;
}) {
  const { VideoTrack, useTracks, useLocalParticipant } = rn;
  const { localParticipant } = useLocalParticipant();
  const [publishError, setPublishError] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraFacing>('user');
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!isHost || !localParticipant) return;
    let cancelled = false;
    (async () => {
      try {
        await localParticipant.setCameraEnabled(true, { facingMode: facing });
        await localParticipant.setMicrophoneEnabled(true);
        if (!cancelled) setPublishError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Camera or microphone permission denied';
        console.warn('[livekit] publish failed', err);
        if (!cancelled) setPublishError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Publish once when the participant is ready; facing changes go through switchCamera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, localParticipant]);

  const switchCamera = useCallback(() => {
    if (!isHost || !localParticipant || switching) return;
    const next: CameraFacing = facing === 'user' ? 'environment' : 'user';
    setSwitching(true);
    void (async () => {
      try {
        const publication = localParticipant.getTrackPublication(client.Track.Source.Camera);
        const track = publication?.track as
          | {
              restartTrack?: (opts: { facingMode: CameraFacing }) => Promise<void>;
              mediaStreamTrack?: { _switchCamera?: () => void };
            }
          | undefined;
        if (typeof track?.restartTrack === 'function') {
          await track.restartTrack({ facingMode: next });
        } else if (typeof track?.mediaStreamTrack?._switchCamera === 'function') {
          track.mediaStreamTrack._switchCamera();
        } else {
          await localParticipant.setCameraEnabled(false);
          await localParticipant.setCameraEnabled(true, { facingMode: next });
        }
        setFacing(next);
      } catch (err) {
        console.warn('[livekit] switch camera failed', err);
        try {
          await localParticipant.setCameraEnabled(false);
          await localParticipant.setCameraEnabled(true, { facingMode: next });
          setFacing(next);
        } catch (fallbackErr) {
          console.warn('[livekit] switch camera fallback failed', fallbackErr);
        }
      } finally {
        setSwitching(false);
      }
    })();
  }, [client.Track.Source.Camera, facing, isHost, localParticipant, switching]);

  const tracks = useTracks([client.Track.Source.Camera], { onlySubscribed: !isHost });
  const track = tracks[0];
  const cameraReady = Boolean(isHost && localParticipant && track);

  useEffect(() => {
    onCameraApi?.({
      ready: cameraReady,
      switching,
      facing,
      switchCamera,
    });
  }, [cameraReady, facing, onCameraApi, switchCamera, switching]);

  useEffect(() => {
    return () => onCameraApi?.(idleCamera);
  }, [onCameraApi]);

  if (!track) {
    return (
      <View style={styles.placeholder}>
        <VideoIcon size={34} color="rgba(255,247,240,0.28)" />
        <Text style={styles.placeholderLabel}>{isHost ? 'YOUR CAMERA' : 'LIVE VIDEO'}</Text>
        <Text style={styles.placeholderText}>
          {isHost
            ? publishError
              ? publishError
              : 'Opening camera…'
            : 'Waiting for host…'}
        </Text>
      </View>
    );
  }

  return <VideoTrack trackRef={track} style={styles.video} objectFit="cover" mirror={isHost && facing === 'user'} />;
}

export function LiveBadgeRow({
  viewers,
  duration,
  onPressViewers,
}: {
  viewers?: number;
  duration?: string;
  onPressViewers?: () => void;
}) {
  return (
    <View style={styles.badgeRow}>
      <View style={styles.liveBadge}>
        <Text style={styles.liveBadgeText}>LIVE</Text>
      </View>
      {viewers != null ? (
        <Pressable
          onPress={onPressViewers}
          disabled={!onPressViewers}
          style={styles.viewerBadge}
          hitSlop={8}
          accessibilityRole={onPressViewers ? 'button' : undefined}
          accessibilityLabel={`${viewers} watching`}
        >
          <EyeIcon size={12} />
          <Text style={styles.viewerText}>{viewers}</Text>
        </Pressable>
      ) : null}
      {duration ? (
        <View style={styles.viewerBadge}>
          <Text style={styles.viewerText}>{duration}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function LiveIconButton({
  onPress,
  children,
  accessibilityLabel,
}: {
  onPress?: () => void;
  children: ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.iconButton}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Pressable>
  );
}

export function LiveHostChip({
  host,
  subtitle,
  photoUrl,
  onPress,
}: {
  host: string;
  subtitle?: string;
  photoUrl?: string | null;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.hostChip}>
      <ProfileAvatar uri={photoUrl} username={host} style={styles.hostAvatar} />
      <View>
        <Text style={styles.hostName}>{host}</Text>
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
  const inputRef = useRef<TextInput>(null);
  const focusedRef = useRef(false);
  const keyboard = useKeyboardInset();

  function handleSend() {
    onSend();
    // Blur so the next tap re-focuses and the soft keyboard can open again (Android).
    inputRef.current?.blur();
    Keyboard.dismiss();
  }

  return (
    <View style={styles.composer}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={LIVE_IVORY_60}
        style={styles.composerInput}
        returnKeyType="send"
        blurOnSubmit={false}
        showSoftInputOnFocus
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={() => {
          focusedRef.current = false;
        }}
        onPressIn={() => {
          // Focus without keyboard (common after dismiss): bounce focus to reopen IME.
          if (Platform.OS === 'android' && focusedRef.current && keyboard.height <= 0) {
            inputRef.current?.blur();
            requestAnimationFrame(() => inputRef.current?.focus());
          }
        }}
        onSubmitEditing={handleSend}
      />
      <Pressable onPress={handleSend} style={styles.sendButton}>
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
  onPin,
  onMute,
  onRemoveViewer,
  onReport,
}: {
  visible: boolean;
  comment: LiveComment | null;
  onClose: () => void;
  onRemove?: () => void;
  onPin?: () => void;
  onMute?: () => void;
  onRemoveViewer?: () => void;
  onReport?: () => void;
}) {
  const { sheetBottom } = useScreenInsets();
  if (!comment) return null;

  const actions = [
    { label: 'Pin comment', destructive: false, onPress: () => { onPin?.(); onClose(); } },
    { label: 'Remove comment', destructive: true, onPress: () => { onRemove?.(); onClose(); } },
    { label: 'Mute viewer', destructive: true, onPress: () => { onMute?.(); onClose(); } },
    { label: 'Remove viewer from live', destructive: true, onPress: () => { onRemoveViewer?.(); onClose(); } },
    { label: 'Report to Throve', destructive: true, onPress: () => { onReport?.(); onClose(); } },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={[styles.sheetCard, { paddingBottom: sheetBottom }]} onStartShouldSetResponder={() => true}>
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

export function LiveHostCameraSwitch() {
  const camera = useHostCamera();
  const disabled = !camera.ready || camera.switching;
  return (
    <View style={styles.sideRail} pointerEvents="box-none">
      <LiveIconButton
        onPress={disabled ? undefined : camera.switchCamera}
        accessibilityLabel={camera.facing === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
      >
        <CameraSwitchIcon
          size={18}
          color={disabled ? 'rgba(255,247,240,0.45)' : Palette.ivory}
        />
      </LiveIconButton>
      <Text style={[styles.sideRailLabel, disabled && styles.sideRailLabelDim]}>
        {camera.facing === 'user' ? 'Front' : 'Back'}
      </Text>
    </View>
  );
}

export function LiveHostTopBar({
  viewers,
  duration,
  sessionId,
  onEnd,
  onLeave,
  onModeration,
}: {
  viewers?: number;
  duration?: string;
  sessionId?: string;
  onEnd: () => void;
  /** Leave the studio UI without ending the live session. */
  onLeave?: () => void;
  onModeration?: () => void;
}) {
  const [watchersOpen, setWatchersOpen] = useState(false);
  return (
    <>
      <View style={styles.hostTopBar}>
        <View style={styles.hostLeftCol}>
          {onLeave ? (
            <LiveIconButton onPress={onLeave}>
              <ChevronBackIcon size={18} color={Palette.ivory} />
            </LiveIconButton>
          ) : (
            <View style={styles.hostLeftPlaceholder} />
          )}
          <LiveHostCameraSwitch />
        </View>
        <LiveBadgeRow
          viewers={viewers}
          duration={duration}
          onPressViewers={sessionId ? () => setWatchersOpen(true) : undefined}
        />
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
      {sessionId ? (
        <LiveWatchersSheet visible={watchersOpen} sessionId={sessionId} onClose={() => setWatchersOpen(false)} />
      ) : null}
    </>
  );
}

export function LiveViewerTopBar({
  viewers,
  sessionId,
  onClose,
  onMore,
}: {
  viewers?: number;
  sessionId?: string;
  onClose: () => void;
  onMore?: () => void;
}) {
  const [watchersOpen, setWatchersOpen] = useState(false);
  return (
    <>
      <View style={styles.hostTopBar}>
        <LiveBadgeRow
          viewers={viewers}
          onPressViewers={sessionId ? () => setWatchersOpen(true) : undefined}
        />
        <View style={styles.hostTopSpacer} />
        {onMore ? (
          <LiveIconButton onPress={onMore}>
            <MoreHorizontalIcon />
          </LiveIconButton>
        ) : null}
        <LiveIconButton onPress={onClose}>
          <CloseIcon color={Palette.ivory} size={16} />
        </LiveIconButton>
      </View>
      {sessionId ? (
        <LiveWatchersSheet visible={watchersOpen} sessionId={sessionId} onClose={() => setWatchersOpen(false)} />
      ) : null}
    </>
  );
}

export function LiveReportSheet({
  visible,
  onClose,
  onReportSession,
  onReportUser,
  onReportListing,
  onLeave,
}: {
  visible: boolean;
  onClose: () => void;
  onReportSession: () => void;
  onReportUser: () => void;
  onReportListing: () => void;
  onLeave: () => void;
}) {
  const { sheetBottom } = useScreenInsets();
  const actions = [
    { label: 'Report live session', destructive: false, onPress: onReportSession },
    { label: 'Report user', destructive: false, onPress: onReportUser },
    { label: 'Report listing', destructive: false, onPress: onReportListing },
    { label: 'Leave live', destructive: true, onPress: onLeave },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetOverlay} onPress={onClose}>
        <View style={[styles.sheetCard, { paddingBottom: sheetBottom }]} onStartShouldSetResponder={() => true}>
          <Text style={styles.reportSheetTitle}>Report controls</Text>
          {actions.map((action, index) => (
            <View key={action.label}>
              {index > 0 ? <View style={styles.sheetDivider} /> : null}
              <Pressable
                onPress={() => {
                  action.onPress();
                  onClose();
                }}
                style={styles.sheetAction}
              >
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

const styles = StyleSheet.create({
  room: {
    flex: 1,
    backgroundColor: Palette.liveDarkAlt,
  },
  videoLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  ivsHostBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 120,
    padding: 14,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 6,
  },
  ivsHostTitle: {
    fontFamily: Typography.bodySemiBold,
    fontSize: 14,
    color: Palette.ivory,
  },
  ivsHostCopy: {
    fontFamily: Typography.body,
    fontSize: 12,
    color: LIVE_IVORY_62,
  },
  ivsHostMeta: {
    marginTop: 4,
    fontFamily: Typography.body,
    fontSize: 11,
    color: Palette.blush,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
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
  mediaErrorCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 10,
  },
  mediaErrorTitle: {
    fontSize: 16,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
    textAlign: 'center',
  },
  mediaErrorCopy: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.body,
    color: LIVE_IVORY_60,
    textAlign: 'center',
  },
  mediaRetryBtn: {
    marginTop: 8,
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaRetryLabel: {
    fontSize: 13,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
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
    overflow: 'hidden',
    backgroundColor: Palette.border,
    borderWidth: 1,
    borderColor: Palette.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarImage: {
    width: 34,
    height: 34,
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
  reportSheetTitle: {
    fontSize: 14,
    fontFamily: Typography.bodySemiBold,
    color: Palette.espresso,
    marginBottom: 6,
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
    alignItems: 'flex-start',
    gap: 6,
  },
  hostLeftCol: {
    alignItems: 'center',
    gap: 10,
  },
  hostLeftPlaceholder: {
    width: 34,
    height: 34,
  },
  hostTopSpacer: {
    flex: 1,
    minWidth: 4,
  },
  endLiveBtn: {
    flexShrink: 0,
    minHeight: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,247,240,0.4)',
    borderRadius: 17,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endLiveLabel: {
    fontSize: 11.5,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
  },
  sideRail: {
    alignItems: 'center',
    gap: 5,
  },
  sideRailLabel: {
    fontSize: 10,
    fontFamily: Typography.bodySemiBold,
    color: Palette.ivory,
    textShadowColor: 'rgba(27,17,19,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sideRailLabelDim: {
    color: 'rgba(255,247,240,0.45)',
  },
});
