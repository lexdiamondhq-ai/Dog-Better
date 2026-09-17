import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen, ScreenHeader, Section } from '@/components/ui/Screen';
import { Surface } from '@/components/ui/Surface';
import { Tap } from '@/components/ui/Tap';
import { Text } from '@/components/ui/Text';
import { contactSupport } from '@/lib/support';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

const FAQ: { section: string; items: { q: string; a: string }[] }[] = [
  {
    section: 'The basics',
    items: [
      { q: 'What is the Better Score?', a: 'A 0 to 100 nudge across Nutrition, Health, Records, and Connection. Every point is explained under the bar, and the card below it tells you exactly what would add points today. It never drops because you did not log; a quiet day holds its last state.' },
      { q: 'Is this a diagnosis?', a: 'No. The symptom detective sorts urgency (watch at home, vet within 24 hours, vet now) and keeps a record you can show your vet. It never names a condition. When in doubt, call your clinic.' },
      { q: 'Who can see my dog\u2019s data?', a: 'Records, health logs, and Profile photos are private to your account. The care sheet is only shared when you send it. Anything you post in Community or Barks is visible to other signed-in Dog Better members.' },
    ],
  },
  {
    section: 'Tracking',
    items: [
      { q: 'Why log meals if I feed the same thing every day?', a: 'Consistency is the point. When something goes wrong, the first question a vet asks is what changed in the last 72 hours. A steady log is what makes the change visible.' },
      { q: 'How does the treat scanner decide?', a: 'It looks up the barcode on Open Food Facts, checks the ingredient list against toxic items with dose math for your dog\u2019s weight, and cross-checks your dog\u2019s own allergies. No barcode? Paste the ingredients.' },
      { q: 'What are the photos for?', a: 'Paws, ears, skin, gait. The same spot photographed every few days makes a trend obvious to you and your vet in a way memory never will.' },
    ],
  },
  {
    section: 'Care team',
    items: [
      { q: 'What is the care sheet?', a: 'A one-page handoff built from the profile: feeding, do-not list, quirks, vet, emergency signs. Send it to a sitter, walker, or family member. It is always current because it is generated, not typed.' },
      { q: 'Can a sitter log things too?', a: 'The sheet is one direction: you to them. If a sitter or partner wants to log meals and walks, sign in together on their phone with your account.' },
    ],
  },
  {
    section: 'Account',
    items: [
      { q: 'How do I sign in on a new phone?', a: 'Continue with Apple or Google, or enter your email and type the 6-digit code we send. No password to remember.' },
      { q: 'How do I export or delete my data?', a: 'Settings, Your data, Export everything gives you a file with every record. Settings, Account, Delete account removes your account, every dog, log, photo, and post right away. It cannot be undone.' },
      { q: 'How do I add a second dog?', a: 'Tap the dog photo on Today or Profile, then Add another dog. Settings also has a Dogs section. One dog is free. Premium adds every dog in the house, each with their own plan, photos, and score.' },
      { q: 'What is the treat jar?', a: 'A running tally for useful work: meals, walks, photos, tips, scans, community posts. It never drops. Settings, Treat jar lists every way to earn and your recent awards.' },
    ],
  },
];

export default function HelpCenter() {
  const router = useRouter();
  return (
    <Screen>
      <ScreenHeader eyebrow="Settings" title="Help center" subtitle="Short answers. If yours is not here, write to us." onBack={() => router.back()} large={false} />
      {FAQ.map((s) => (
        <Section key={s.section} title={s.section}>
          <Surface kind="grouped" padding={0} style={{ overflow: 'hidden' }}>
            {s.items.map((it, i) => (
              <FaqRow key={it.q} q={it.q} a={it.a} last={i === s.items.length - 1} />
            ))}
          </Surface>
        </Section>
      ))}
      <Button label="Still stuck? Email support" icon="mail" kind="secondary" onPress={() => contactSupport('Help with Dog Better')} />
    </Screen>
  );
}

function FaqRow({ q, a, last }: { q: string; a: string; last: boolean }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Tap onPress={() => setOpen((v) => !v)} haptic="selection" scaleTo={0.995}>
      <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
        <View style={styles.head}>
          <Text variant="bodyStrong" style={{ flex: 1 }}>
            {q}
          </Text>
          <Icon name="chevron" size={16} color={t.textTertiary} style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }} />
        </View>
        {open ? (
          <Text variant="body" tone="secondary">
            {a}
          </Text>
        ) : null}
      </View>
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
