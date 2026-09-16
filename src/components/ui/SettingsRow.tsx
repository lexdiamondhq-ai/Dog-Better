import { StyleSheet, Switch, View } from 'react-native';

import { Icon, type IconName } from './Icon';
import { IconWell } from './IconWell';
import { Tap } from './Tap';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

type Props = {
  icon: IconName;
  label: string;
  detail?: string;
  onPress?: () => void;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void };
  value?: string;
  tone?: 'default' | 'danger';
  last?: boolean;
};

/** One row of a settings list: icon, label, optional detail, and either a value + chevron or a switch. */
export function SettingsRow({ icon, label, detail, onPress, toggle, value, tone = 'default', last }: Props) {
  const t = useTheme();
  const fg = tone === 'danger' ? t.bad : t.text;
  const inner = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }]}>
      <IconWell name={icon} tone={tone === 'danger' ? 'bad' : 'brand'} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="bodyStrong" style={{ color: fg }}>
          {label}
        </Text>
        {detail ? (
          <Text variant="caption" tone="secondary">
            {detail}
          </Text>
        ) : null}
      </View>
      {toggle ? (
        <Switch value={toggle.value} onValueChange={toggle.onChange} trackColor={{ true: t.brand }} />
      ) : (
        <>
          {value ? (
            <Text variant="caption" tone="tertiary">
              {value}
            </Text>
          ) : null}
          {onPress ? <Icon name="chevron" size={16} color={t.textTertiary} /> : null}
        </>
      )}
    </View>
  );
  if (!onPress || toggle) return inner;
  return (
    <Tap onPress={onPress} haptic="selection" scaleTo={0.99}>
      {inner}
    </Tap>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, minHeight: 56 },
});
