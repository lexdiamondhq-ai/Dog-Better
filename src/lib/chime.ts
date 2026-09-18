import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;
let armed = false;

async function arm() {
  if (armed && player) return player;
  await setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  });
  player = createAudioPlayer(require('@/assets/sound/chime.wav'));
  armed = true;
  return player;
}

/** Soft two-note ding. Mixes with whatever is already playing. */
export async function playChime() {
  try {
    const tone = await arm();
    await tone.seekTo(0);
    tone.play();
  } catch {
    // Expo Go without the native module, or a locked audio session. The flip still works.
  }
}
