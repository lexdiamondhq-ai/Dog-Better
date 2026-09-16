import { useState } from 'react';
import { Keyboard, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: string;
};

export function Field({ label, hint, error, suffix, style, ...rest }: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? t.bad : focused ? t.brand : t.border;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" tone="secondary">
          {label}
        </Text>
      ) : null}
      <View style={[styles.box, { backgroundColor: t.bgRaised, borderColor }]}>
        <TextInput
          {...rest}
          blurOnSubmit={rest.blurOnSubmit ?? !rest.multiline}
          returnKeyType={rest.returnKeyType ?? (rest.multiline ? 'default' : 'done')}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          onSubmitEditing={(e) => {
            if (!rest.multiline) Keyboard.dismiss();
            rest.onSubmitEditing?.(e);
          }}
          placeholderTextColor={t.textTertiary}
          selectionColor={t.brand}
          style={[styles.input, { color: t.text }, style]}
        />
        {suffix ? (
          <Text variant="label" tone="tertiary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="bad">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    minHeight: 54,
    gap: space.sm,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, paddingVertical: space.md },
});
