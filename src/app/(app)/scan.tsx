import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Glass } from '@/components/ui/Glass';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { AFFILIATE_DISCLOSURE } from '@/content/partners';
import { analyzeIngredients, servingKcal, type SafetyReport, type Verdict } from '@/engine/foodSafety';
import { useDogActivity } from '@/lib/activity';
import { track } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { REWARDS } from '@/engine/rewards';
import { useDogs } from '@/lib/dogs';
import { usePoints } from '@/lib/points';
import { lookupBarcode, type Product } from '@/lib/openFoodFacts';
import { amazonSearch } from '@/lib/shop';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, space } from '@/theme/tokens';

type Mode = 'scan' | 'type';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'code93', 'itf14', 'codabar'] as const;
/** ASPCA Animal Poison Control Center, 24/7. */
const POISON_CONTROL = '8884264435';

/**
 * The viewfinder is the whole screen. A scan line sweeps the frame; the moment a
 * barcode lands, the product and verdict rise from the bottom over the frozen camera.
 * No barcode? Flip to "type it" and paste the ingredient line from the label.
 */
export default function Scan() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { dog } = useDogs();
  const activity = useDogActivity(dog);
  const { award } = usePoints();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('scan');
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [report, setReport] = useState<SafetyReport | null>(null);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [typedName, setTypedName] = useState('');
  const [barcodeDigits, setBarcodeDigits] = useState('');
  const [saved, setSaved] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [pieces, setPieces] = useState(1);
  const [gramsEach, setGramsEach] = useState('5');
  const lastCode = useRef<string | null>(null);
  const locked = useRef(false);
  const launchedScanner = useRef(false);
  const dogRef = useRef(dog);
  useEffect(() => {
    dogRef.current = dog;
  }, [dog]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const lookupCode = useCallback(async (raw: string) => {
    const code = raw.replace(/\D/g, '') || raw.replace(/\s/g, '');
    if (locked.current || !code || code === lastCode.current) return;
    locked.current = true;
    lastCode.current = code;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBusy(true);
    setNotFound(null);
    setLookupError(null);
    if (launchedScanner.current) {
      launchedScanner.current = false;
      try {
        await CameraView.dismissScanner();
      } catch {
        /* overlay camera stays up */
      }
    }
    try {
      const current = dogRef.current;
      const p = await lookupBarcode(code);
      if (!p) {
        setNotFound(code);
        locked.current = false;
        lastCode.current = null;
        return;
      }
      setProduct(p);
      setPieces(1);
      setGramsEach('5');
      setReport(
        analyzeIngredients({
          ingredientsText: p.ingredientsText,
          weightKg: current?.weight_kg,
          kcalPer100g: p.kcalPer100g,
          allergies: current?.allergies ?? [],
        }),
      );
      setSaved(false);
      void track('scan_complete', { found: true });
    } catch {
      setLookupError(code);
      locked.current = false;
      lastCode.current = null;
    } finally {
      setBusy(false);
    }
  }, []);

  const onScan = ({ data }: BarcodeScanningResult) => {
    void lookupCode(data);
  };

  useEffect(() => {
    const sub = CameraView.onModernBarcodeScanned((event) => {
      void lookupCode(event.data);
    });
    return () => {
      sub.remove();
    };
  }, [lookupCode]);

  const openSystemScanner = async () => {
    if (!CameraView.isModernBarcodeScannerAvailable) return;
    try {
      launchedScanner.current = true;
      await CameraView.launchScanner({ barcodeTypes: [...BARCODE_TYPES], isHighlightingEnabled: true, isGuidanceEnabled: true });
    } catch {
      launchedScanner.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (launchedScanner.current) {
          launchedScanner.current = false;
          void CameraView.dismissScanner().catch(() => undefined);
        }
      };
    }, []),
  );

  const analyzeTyped = () => {
    if (!typed.trim()) return;
    Keyboard.dismiss();
    setProduct({ barcode: '', name: typedName.trim() || 'Typed ingredients', brand: null, ingredientsText: typed, kcalPer100g: null, image: null });
    setPieces(1);
    setGramsEach('5');
    setReport(analyzeIngredients({ ingredientsText: typed, weightKg: dog?.weight_kg, allergies: dog?.allergies ?? [] }));
    setSaved(false);
  };

  const clear = () => {
    Keyboard.dismiss();
    setProduct(null);
    setReport(null);
    setNotFound(null);
    setSaved(false);
    setBarcodeDigits('');
    setPieces(1);
    setGramsEach('5');
    locked.current = false;
    lastCode.current = null;
  };

  const goScan = () => {
    clear();
    setMode('scan');
    setCameraKey((k) => k + 1);
  };

  const grams = Math.max(0, pieces * (Number.parseInt(gramsEach, 10) || 0));
  const thisKcal = servingKcal(product?.kcalPer100g, grams);
  const leftover =
    report?.treatBudgetKcal != null ? report.treatBudgetKcal - activity.treatKcalToday - (thisKcal ?? 0) : null;

  const save = async () => {
    if (!user || !dog || !product || !report) return;
    await supabase.from('food_scans').insert({
      dog_id: dog.id,
      owner_id: user.id,
      barcode: product.barcode || null,
      product_name: product.name,
      brand: product.brand,
      verdict: report.verdict,
      flagged: report.flags.map((f) => ({ id: f.id, label: f.label, level: f.level })),
    });
    if (report.verdict !== 'danger') {
      await supabase.from('meals').insert({
        dog_id: dog.id,
        owner_id: user.id,
        kind: 'treat',
        label: `${pieces} ${pieces === 1 ? 'piece' : 'pieces'} · ${product.name ?? 'treat'}`,
        calories: thisKcal,
      });
    }
    await award({ kind: 'scan', key: `scan:${dog.id}:${product.barcode || product.name}:${new Date().toISOString().slice(0, 10)}`, dogId: dog.id });
    await activity.reload();
    setSaved(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {mode === 'scan' && permission?.granted ? <StatusBar style="light" /> : null}
      {mode === 'scan' && permission?.granted ? (
        <CameraView
          key={cameraKey}
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
          onBarcodeScanned={onScan}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]} />
      )}

      {mode === 'scan' && permission?.granted && !product ? (
        <>
          <Viewfinder busy={busy} />
          <View style={[styles.manual, { paddingBottom: insets.bottom + space.md }]} pointerEvents="box-none">
            <Button label="Open barcode scanner" icon="scan" onPress={() => void openSystemScanner()} />
            <Surface kind="raised" style={{ gap: space.sm }}>
              <Field
                label="Or type the barcode"
                placeholder="e.g. 012345678905"
                value={barcodeDigits}
                onChangeText={setBarcodeDigits}
                keyboardType="number-pad"
                onSubmitEditing={() => void lookupCode(barcodeDigits)}
              />
              <Button label="Look up this code" kind="secondary" onPress={() => void lookupCode(barcodeDigits)} disabled={!barcodeDigits.trim() || busy} />
            </Surface>
          </View>
        </>
      ) : null}

      <View style={[styles.top, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        <Tap onPress={() => router.back()} haptic="selection" accessibilityLabel="Close">
          <Glass borderRadius={22} style={styles.glassBtn}>
            <Icon name="close" size={18} />
          </Glass>
        </Tap>
        <Glass borderRadius={radius.pill} style={styles.segment}>
          <Seg label="Scan" icon="scan" on={mode === 'scan' && !product} onPress={goScan} />
          <Seg label="Type it" icon="edit" on={mode === 'type' && !product} onPress={() => { Keyboard.dismiss(); setMode('type'); clear(); }} />
        </Glass>
        <View style={{ width: 44 }} />
      </View>

      {mode === 'scan' && permission && !permission.granted ? (
        <View style={[styles.center, { padding: space.xl, gap: space.md }]}>
          <Icon name="scan" size={40} color={t.brand} />
          <Text variant="title" align="center">
            Point at a barcode
          </Text>
          <Text variant="body" tone="secondary" align="center">
            The camera reads the barcode and we check every ingredient against what is safe for {dog?.name ?? 'your dog'}.
          </Text>
          <Button label="Allow camera" onPress={requestPermission} />
          <Button label="Type ingredients instead" kind="ghost" onPress={() => setMode('type')} />
        </View>
      ) : null}

      {mode === 'type' && !product ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <ScrollView contentContainerStyle={{ paddingTop: insets.top + 84, padding: space.xl, gap: space.lg }} keyboardShouldPersistTaps="handled">
            <View style={{ gap: space.xs }}>
              <Text variant="overline" tone="tertiary">
                Treat scanner
              </Text>
              <Text variant="display">Paste the label</Text>
              <Text variant="body" tone="secondary">
                Copy the ingredients line from the package, or type what is in a homemade snack.
              </Text>
            </View>
            <Surface kind="raised" style={{ gap: space.md }}>
              <Field label="What is it? (optional)" placeholder="Peanut butter cookies" value={typedName} onChangeText={setTypedName} />
              <Field label="Ingredients" placeholder="Peanuts, sugar, palm oil, salt..." value={typed} onChangeText={setTyped} multiline style={{ minHeight: 120 }} autoFocus />
              <Button label="Check for my dog" icon="sparkle" onPress={analyzeTyped} disabled={!typed.trim()} size="lg" />
            </Surface>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}

      {lookupError && !product && !notFound ? (
        <Animated.View entering={FadeInUp} exiting={FadeOut} style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Surface kind="raised" radiusSize="xl" style={{ gap: space.md }}>
            <View style={styles.row}>
              <Icon name="warning" size={20} color={t.warn} />
              <Text variant="headline" style={{ flex: 1 }}>
                Could not reach the database
              </Text>
            </View>
            <Text variant="body" tone="secondary">
              Barcode {lookupError} could not be looked up right now. Check your connection, or type the ingredients from the label.
            </Text>
            <View style={styles.row}>
              <Button label="Try again" onPress={() => void lookupCode(lookupError)} style={{ flex: 1 }} />
              <Button label="Type ingredients" kind="secondary" icon="edit" onPress={() => setMode('type')} />
            </View>
          </Surface>
        </Animated.View>
      ) : null}

      {notFound && !product ? (
        <Animated.View entering={FadeInUp} exiting={FadeOut} style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }]}>
          <Surface kind="raised" radiusSize="xl" style={{ gap: space.md }}>
            <View style={styles.row}>
              <Icon name="info" size={20} color={t.textSecondary} />
              <Text variant="headline" style={{ flex: 1 }}>
                Not in the database yet
              </Text>
            </View>
            <Text variant="body" tone="secondary">
              Barcode {notFound} has no public ingredient list. Type the ingredients from the label and we will check them.
            </Text>
            <View style={styles.row}>
              <Button label="Type ingredients" icon="edit" onPress={() => setMode('type')} style={{ flex: 1 }} />
              <Button label="Rescan" kind="secondary" onPress={goScan} />
            </View>
          </Surface>
        </Animated.View>
      ) : null}

      {product && report ? (
        <Animated.View entering={FadeInUp.duration(260)} style={[styles.sheet, { paddingBottom: insets.bottom + space.md, maxHeight: '82%' }]}>
          <Surface kind="raised" radiusSize="xl" padding={0} style={{ overflow: 'hidden' }}>
            <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.lg }} showsVerticalScrollIndicator={false}>
              <VerdictBanner report={report} dogName={dog?.name} />

              <View style={styles.row}>
                {product.image ? (
                  <Image source={{ uri: product.image }} style={styles.thumb} contentFit="contain" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: t.surface }]}>
                    <Icon name="meal" size={22} color={t.brand} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="headline" numberOfLines={2}>
                    {product.name ?? 'Unnamed product'}
                  </Text>
                  {product.brand ? (
                    <Text variant="caption" tone="secondary">
                      {product.brand}
                    </Text>
                  ) : null}
                </View>
              </View>

              {report.flags.length ? (
                <View style={{ gap: space.sm }}>
                  {report.flags.map((f) => (
                    <View key={f.id} style={[styles.flag, { backgroundColor: f.level === 'danger' ? t.bad : t.warn }]}>
                      <Icon name={f.level === 'danger' ? 'danger' : 'warning'} size={18} color="#FFF8F2" />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong" style={{ color: '#FFF8F2' }}>
                          {f.label} <Text variant="caption" style={{ color: 'rgba(255,248,242,0.8)' }}>{`found "${f.matched}"`}</Text>
                        </Text>
                        <Text variant="caption" style={{ color: 'rgba(255,248,242,0.92)' }}>
                          {f.why}
                        </Text>
                        {f.dose ? (
                          <Text variant="caption" style={{ color: 'rgba(255,248,242,0.92)', fontStyle: 'italic' }}>
                            {f.dose}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              {report.allergyHits.length ? (
                <View style={[styles.flag, { backgroundColor: t.bad }]}>
                  <Icon name="danger" size={18} color="#FFF8F2" />
                  <Text variant="bodyStrong" style={{ color: '#FFF8F2', flex: 1 }}>
                    {`Contains ${report.allergyHits.join(', ')} from ${dog?.name ?? 'your dog'}'s allergy list`}
                  </Text>
                </View>
              ) : null}

              {report.verdict !== 'danger' ? (
                <View style={{ gap: space.sm }}>
                  <Text variant="overline" tone="tertiary">
                    How much did they get?
                  </Text>
                  <View style={styles.row}>
                    <Tap
                      haptic="selection"
                      onPress={() => setPieces((n) => Math.max(1, n - 1))}
                      style={[styles.step, { backgroundColor: t.surface }]}
                      accessibilityLabel="Fewer pieces">
                      <Text variant="headline">-</Text>
                    </Tap>
                    <Text variant="headline" style={{ minWidth: 72, textAlign: 'center' }}>
                      {pieces} {pieces === 1 ? 'piece' : 'pieces'}
                    </Text>
                    <Tap
                      haptic="selection"
                      onPress={() => setPieces((n) => Math.min(30, n + 1))}
                      style={[styles.step, { backgroundColor: t.surface }]}
                      accessibilityLabel="More pieces">
                      <Text variant="headline">+</Text>
                    </Tap>
                  </View>
                  <Field
                    label="Grams each"
                    hint="Weigh one piece if the bag does not say. Training treats are often 3 to 6 g."
                    value={gramsEach}
                    onChangeText={setGramsEach}
                    keyboardType="number-pad"
                    suffix="g"
                  />
                  <View style={styles.stats}>
                    <Stat label="This serving" value={thisKcal ? `${thisKcal} kcal` : product.kcalPer100g ? '0 kcal' : 'Unknown'} />
                    <Stat label="Treat budget left" value={leftover == null ? '-' : leftover < 0 ? `Over ${Math.abs(leftover)}` : `${leftover} kcal`} />
                  </View>
                  {report.budgetGrams ? (
                    <Text variant="caption" tone="tertiary">
                      Daily treat budget is {report.treatBudgetKcal} kcal, about {report.budgetGrams} g of this bag.
                    </Text>
                  ) : product.kcalPer100g ? null : (
                    <Text variant="caption" tone="tertiary">
                      This bag has no public calorie number. We still log the pieces.
                    </Text>
                  )}
                </View>
              ) : null}

              {product.ingredientsText ? (
                <View style={{ gap: space.xs }}>
                  <Text variant="overline" tone="tertiary">
                    Ingredients
                  </Text>
                  <Text variant="caption" tone="secondary">
                    {product.ingredientsText}
                  </Text>
                </View>
              ) : null}

              {report.verdict === 'danger' ? (
                <View style={[styles.flag, { backgroundColor: t.surface }]}>
                  <Icon name="phone" size={18} color={t.bad} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong">Already ate it?</Text>
                    <Text variant="caption" tone="secondary">
                      Call your vet, or ASPCA Animal Poison Control (a fee may apply). Do not wait for symptoms.
                    </Text>
                  </View>
                  <Button label="Call ASPCA" kind="danger" size="sm" onPress={() => Linking.openURL(`tel:${POISON_CONTROL}`)} />
                </View>
              ) : null}

              <View style={{ gap: space.xs }}>
                <Button
                  label={report.verdict === 'danger' || report.verdict === 'caution' ? 'Shop a safer option' : 'Buy this on Amazon'}
                  icon="link"
                  kind="ghost"
                  onPress={() => {
                    void track('scan_shop_click', { verdict: report.verdict });
                    void Linking.openURL(
                      amazonSearch(report.verdict === 'danger' || report.verdict === 'caution' ? 'dog treats no xylitol no grapes' : product.name || product.brand || 'dog treats'),
                    );
                  }}
                />
                <Text variant="micro" tone="tertiary" align="center">
                  {AFFILIATE_DISCLOSURE}
                </Text>
              </View>

              <View style={styles.row}>
                <Button
                  label={
                    saved
                      ? 'Saved'
                      : report.verdict === 'danger'
                        ? `Save scan  +${REWARDS.scan.points}`
                        : thisKcal
                          ? `Log ${thisKcal} kcal  +${REWARDS.scan.points}`
                          : `Log treat  +${REWARDS.scan.points}`
                  }
                  icon={saved ? 'check' : 'plus'}
                  kind={saved ? 'secondary' : 'primary'}
                  disabled={saved}
                  onPress={save}
                  style={{ flex: 1 }}
                />
                <Button label="Scan another" kind="secondary" icon="scan" onPress={goScan} />
              </View>
            </ScrollView>
          </Surface>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Viewfinder({ busy }: { busy: boolean }) {
  const t = useTheme();
  const y = useSharedValue(0);
  useEffect(() => {
    y.set(withRepeat(withTiming(1, { duration: 1800 }), -1, true));
  }, [y]);
  const line = useAnimatedStyle(() => ({ top: `${8 + y.value * 84}%` }));
  return (
    <View style={styles.center} pointerEvents="none">
      <Animated.View entering={FadeIn} style={styles.frame}>
        {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <View key={c} style={[styles.corner, styles[c], { borderColor: t.accent }]} />
        ))}
        {busy ? <ActivityIndicator color={t.accent} /> : <Animated.View style={[styles.scanLine, { backgroundColor: t.accent }, line]} />}
      </Animated.View>
      <Glass borderRadius={radius.pill} style={styles.hint}>
        <Text variant="label">{busy ? 'Looking it up' : 'Line up the barcode'}</Text>
      </Glass>
    </View>
  );
}

function Seg({ label, icon, on, onPress }: { label: string; icon: IconName; on: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} haptic="selection" style={[styles.seg, on && { backgroundColor: t.brand }]}>
      <Icon name={icon} size={14} color={on ? t.onBrand : t.text} />
      <Text variant="label" style={{ color: on ? t.onBrand : t.text }}>
        {label}
      </Text>
    </Tap>
  );
}

function VerdictBanner({ report, dogName }: { report: SafetyReport; dogName?: string }) {
  const t = useTheme();
  const tone: Record<Verdict, { bg: string; icon: IconName }> = {
    safe: { bg: t.good, icon: 'shield' },
    caution: { bg: t.warn, icon: 'warning' },
    danger: { bg: t.bad, icon: 'danger' },
    unknown: { bg: t.brand, icon: 'info' },
  };
  const v = tone[report.verdict];
  return (
    <View style={[styles.banner, { backgroundColor: v.bg }]}>
      <Icon name={v.icon} size={28} color="#FFFDF8" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="overline" style={{ color: 'rgba(255,253,248,0.85)' }}>
          For {dogName ?? 'your dog'}
        </Text>
        <Text variant="title" style={{ color: '#FFFDF8' }}>
          {report.headline}
        </Text>
        <Text variant="caption" style={{ color: 'rgba(255,253,248,0.92)' }}>
          {report.summary}
        </Text>
      </View>
    </View>
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

const FRAME = 260;
const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, zIndex: 2 },
  glassBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', padding: 4, gap: 2 },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.md, height: 34, borderRadius: radius.pill },
  frame: { width: FRAME, height: FRAME * 0.62, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 34, height: 34, borderWidth: 4 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 18 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 18 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 18 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 18 },
  scanLine: { position: 'absolute', left: 16, right: 16, height: 2, borderRadius: 1, opacity: 0.9 },
  hint: { position: 'absolute', bottom: '32%', paddingHorizontal: space.lg, height: 36, justifyContent: 'center' },
  manual: { position: 'absolute', left: space.md, right: space.md, bottom: 0, gap: space.sm, zIndex: 2 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  flag: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.md, borderRadius: radius.md },
  stats: { flexDirection: 'row', gap: space.sm },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
