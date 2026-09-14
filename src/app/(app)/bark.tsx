import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from 'expo-audio';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { classify, dbToLevel, extractFeatures, MOOD_COPY, type BarkReading, type Mood } from '@/engine/bark';
import { useAuth } from '@/lib/auth';
import { useDogs } from '@/lib/dogs';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { space, springs } from '@/theme/tokens';

const WINDOW_MS = 8000;
const TICK_MS = 50;
const BARS = 36;

type Phase = 'idle' | 'listening' | 'result';

/**
 * Listening is a single big gesture: hold nothing, tap once. The ring fills over
 * eight seconds while a live level meter breathes with the room. The reading arrives
 * with its confidence stated plainly, because a guess dressed as a fact is worse than no guess.
 */
export default function Bark() {
  const t = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { dog } = useDogs();

  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });

  const [phase, setPhase] = useState<Phase>('idle');
  const [reading, setReading] = useState<BarkReading | null>(null);
  const [saved, setSaved] = useState(false);
  const [denied, setDenied] = useState(false);
  const levels = useRef<number[]>([]);
  const recordedMs = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const progress = useSharedValue(0);
  const live = useSharedValue(0);
  const [bars, setBars] = useState<number[]>(() => Array(BARS).fill(0.04));

  const stopTimer = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    const ref = timer;
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, []);

  const start = async () => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setDenied(true);
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    levels.current = [];
    setBars(Array(BARS).fill(0.04));
    setReading(null);
    setSaved(false);
    await recorder.prepareToRecordAsync();
    recorder.record();
    progress.set(0);
    progress.set(withTiming(1, { duration: WINDOW_MS }));
    setPhase('listening');

    stopTimer();
    recordedMs.current = 0;
    timer.current = setInterval(() => {
      const status = recorder.getStatus();
      const level = dbToLevel(status.metering);
      levels.current.push(level);
      live.set(withSpring(level, springs.snappy));
      setBars((prev) => [...prev.slice(1), Math.max(0.04, level)]);
      // The recorder's own clock, not tick count: setInterval drifts while every tick re-renders the meter.
      recordedMs.current = status.durationMillis;
      if (status.durationMillis >= WINDOW_MS) finish();
    }, TICK_MS);
  };

  const finish = async () => {
    stopTimer();
    setPhase('result');
    const elapsed = Math.max(TICK_MS, recordedMs.current);
    try {
      await recorder.stop();
    } catch {
      // stop may throw if the recorder already stopped; the reading is what matters
    }
    await setAudioModeAsync({ allowsRecording: false });
    const features = extractFeatures(levels.current, elapsed / Math.max(1, levels.current.length));
    setReading(classify(features));
  };

  const save = async () => {
    if (!user || !dog || !reading) return;
    await supabase.from('bark_sessions').insert({
      dog_id: dog.id,
      owner_id: user.id,
      mood: reading.mood,
      confidence: Math.round(reading.confidence * 100) / 100,
      duration_ms: reading.features.durationMs,
      features: reading.features,
    });
    setSaved(true);
  };

  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: 1 + live.value * 0.35 }], opacity: 0.25 + live.value * 0.5 }));

  return (
    <Screen>
      <ScreenHeader eyebrow="Translator" title={phase === 'result' ? 'Here is what we heard' : 'Bark and behaviour'} subtitle={phase === 'idle' ? `Hold the phone about a metre from ${dog?.name ?? 'your dog'} and tap to listen.` : undefined} onBack={() => router.back()} />

      <View style={styles.stage}>
        <Animated.View style={[styles.halo, { backgroundColor: t.accent }, pulse]} />
        <ProgressRing progress={progress} size={232} stroke={10} color={phase === 'listening' ? t.accent : t.brand}>
          <Tap onPress={phase === 'listening' ? finish : start} haptic="heavy" scaleTo={0.94} accessibilityLabel={phase === 'listening' ? 'Stop listening' : 'Start listening'}>
            <View style={[styles.mic, { backgroundColor: phase === 'listening' ? t.accent : t.brand }]}>
              <Icon name={phase === 'listening' ? 'stop' : phase === 'result' ? 'refresh' : 'mic'} size={40} color={phase === 'listening' ? '#3A2A10' : t.onBrand} />
            </View>
          </Tap>
        </ProgressRing>
        <Text variant="label" tone="secondary">
          {phase === 'listening' ? 'Listening...' : phase === 'result' ? 'Tap to listen again' : 'Tap to listen for 8 seconds'}
        </Text>
      </View>

      <Surface kind="tonal" style={styles.meter}>
        {bars.map((b, i) => (
          <Bar key={i} value={b} active={phase === 'listening'} />
        ))}
      </Surface>

      {denied ? (
        <Animated.View entering={FadeIn}>
          <Surface kind="outline" style={styles.notice}>
            <Icon name="warning" size={18} color={t.warn} />
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>
              Microphone access is off. Enable it in Settings to use the translator. Audio never leaves the phone.
            </Text>
          </Surface>
        </Animated.View>
      ) : null}

      {reading ? <Result reading={reading} onSave={save} saved={saved} dogName={dog?.name} /> : null}

      {phase === 'idle' ? (
        <Animated.View entering={FadeInUp.delay(200)} exiting={FadeOut}>
          <Section title="How it works">
            <Surface kind="raised" style={{ gap: space.sm }}>
              <Text variant="body" tone="secondary">
                We measure rhythm, loudness, and how much each bark wavers, then match the pattern to what canine acoustics research says each mood sounds like. It runs on your phone, instantly, without recording anything to the cloud.
              </Text>
              <Text variant="caption" tone="tertiary">
                This is an estimate to help you read the room, not a diagnosis. Body language always wins.
              </Text>
            </Surface>
          </Section>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function Bar({ value, active }: { value: number; active: boolean }) {
  const t = useTheme();
  const h = useSharedValue(value);
  useEffect(() => {
    h.set(withSpring(value, springs.snappy));
  }, [value, h]);
  const style = useAnimatedStyle(() => ({ height: 6 + h.value * 50 }));
  return <Animated.View style={[styles.bar, { backgroundColor: active ? t.accent : t.brand }, style]} />;
}

function Result({ reading, onSave, saved, dogName }: { reading: BarkReading; onSave: () => void; saved: boolean; dogName?: string }) {
  const t = useTheme();
  const copy = MOOD_COPY[reading.mood];
  const pct = Math.round(reading.confidence * 100);
  const wobble = useSharedValue(0);
  useEffect(() => {
    wobble.set(withRepeat(withSequence(withTiming(-6, { duration: 120 }), withTiming(6, { duration: 120 }), withTiming(0, { duration: 120 })), 2));
  }, [wobble]);
  const emojiStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wobble.value}deg` }] }));

  const ranked = (Object.entries(reading.scores) as [Mood, number][]).filter(([m]) => m !== 'quiet' && m !== reading.mood).sort((a, b) => b[1] - a[1]).slice(0, 2);

  return (
    <Animated.View entering={FadeInUp.springify().damping(16)} style={{ gap: space.lg }}>
      <Surface kind="fur" style={{ gap: space.md }}>
        <View style={styles.resultHead}>
          <Animated.Text style={[styles.emoji, emojiStyle]}>{copy.emoji}</Animated.Text>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="overline" tone="tertiary">
              {pct}% match
            </Text>
            <Text variant="title">{reading.title}</Text>
          </View>
        </View>
        <Text variant="body">{reading.meaning}</Text>
        <View style={[styles.confidence, { backgroundColor: t.bgRaised }]}>
          <View style={[styles.confidenceFill, { width: `${pct}%`, backgroundColor: t.brand }]} />
        </View>
        {ranked.length ? (
          <Text variant="caption" tone="tertiary">
            Could also be {ranked.map(([m]) => MOOD_COPY[m].title.toLowerCase()).join(' or ')}.
          </Text>
        ) : null}
      </Surface>

      <Section title="Try this">
        <Surface kind="raised" padding={0} style={{ overflow: 'hidden' }}>
          {reading.tryThis.map((tip, i) => (
            <View key={tip} style={[styles.tip, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.border }]}>
              <View style={[styles.tipNum, { backgroundColor: t.surfaceStrong }]}>
                <Text variant="label" tone="brand">
                  {i + 1}
                </Text>
              </View>
              <Text variant="body" style={{ flex: 1 }}>
                {tip}
              </Text>
            </View>
          ))}
        </Surface>
      </Section>

      <View style={styles.stats}>
        <Stat label="Barks" value={String(reading.features.bursts)} />
        <Stat label="Avg length" value={`${Math.round(reading.features.meanBurstMs)} ms`} />
        <Stat label="Peak" value={`${Math.round(reading.features.peak * 100)}%`} />
      </View>

      {reading.mood !== 'quiet' ? <Button label={saved ? `Saved to ${dogName ?? 'the'} timeline` : 'Save to timeline'} icon={saved ? 'check' : 'plus'} kind={saved ? 'secondary' : 'primary'} onPress={onSave} disabled={saved} /> : null}
    </Animated.View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Surface kind="tonal" padding={space.md} style={{ flex: 1, gap: 2 }}>
      <Text variant="headline">{value}</Text>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', gap: space.md, paddingVertical: space.lg },
  halo: { position: 'absolute', top: space.lg + 16, width: 200, height: 200, borderRadius: 100 },
  mic: { width: 150, height: 150, borderRadius: 75, alignItems: 'center', justifyContent: 'center' },
  meter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 84, paddingHorizontal: space.md },
  bar: { width: 4, borderRadius: 2 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  emoji: { fontSize: 44 },
  confidence: { height: 8, borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: '100%', borderRadius: 4 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg },
  tipNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: space.sm },
});
