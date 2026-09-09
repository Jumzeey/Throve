import { MESSAGE_TONE_ASSETS, type MessageToneId } from '@/lib/message-tones';
import { Platform } from 'react-native';

let playing: { unloadAsync: () => Promise<void> } | null = null;

export async function playMessageTone(tone: MessageToneId) {
  if (Platform.OS === 'web' || tone === 'none') return;
  const asset = tone === 'default' ? MESSAGE_TONE_ASSETS.note : MESSAGE_TONE_ASSETS[tone];
  if (!asset) return;
  try {
    const { Audio } = await import('expo-av');
    if (playing) {
      await playing.unloadAsync().catch(() => undefined);
      playing = null;
    }
    const result = await Audio.Sound.createAsync(asset, { shouldPlay: true, volume: 1 });
    playing = result.sound;
    result.sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded || !status.didJustFinish) return;
      void result.sound.unloadAsync();
      if (playing === result.sound) playing = null;
    });
  } catch {
    /* ignore missing audio */
  }
}
