import { SymbolView, type SymbolWeight } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/**
 * Semantic icon names mapped to SF Symbols (iOS) and Material Symbols (Android/web).
 * Keeping one vocabulary here means screens never think about platforms.
 */
export const ICONS = {
  today: { ios: 'sun.horizon.fill', android: 'sunny' },
  care: { ios: 'heart.text.square.fill', android: 'stethoscope' },
  places: { ios: 'map.fill', android: 'map' },
  pack: { ios: 'person.3.fill', android: 'groups' },
  vault: { ios: 'pawprint.fill', android: 'pets' },
  bark: { ios: 'waveform', android: 'graphic_eq' },
  ear: { ios: 'ear.fill', android: 'hearing' },
  symptoms: { ios: 'stethoscope', android: 'stethoscope' },
  scan: { ios: 'barcode.viewfinder', android: 'barcode_scanner' },
  camera: { ios: 'camera.fill', android: 'photo_camera' },
  photo: { ios: 'photo.fill', android: 'image' },
  mic: { ios: 'mic.fill', android: 'mic' },
  plus: { ios: 'plus', android: 'add' },
  close: { ios: 'xmark', android: 'close' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  back: { ios: 'chevron.left', android: 'arrow_back' },
  settings: { ios: 'gearshape.fill', android: 'settings' },
  meal: { ios: 'fork.knife', android: 'restaurant' },
  bolt: { ios: 'bolt.fill', android: 'bolt' },
  check: { ios: 'checkmark', android: 'check' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning' },
  danger: { ios: 'exclamationmark.octagon.fill', android: 'error' },
  trash: { ios: 'trash', android: 'delete' },
  water: { ios: 'drop.fill', android: 'water_drop' },
  walk: { ios: 'figure.walk', android: 'directions_walk' },
  search: { ios: 'magnifyingglass', android: 'search' },
  send: { ios: 'paperplane.fill', android: 'send' },
  edit: { ios: 'pencil', android: 'edit' },
  fire: { ios: 'flame.fill', android: 'local_fire_department' },
  park: { ios: 'tree.fill', android: 'park' },
  weight: { ios: 'scalemass.fill', android: 'monitor_weight' },
  cake: { ios: 'birthday.cake.fill', android: 'cake' },
  shield: { ios: 'checkmark.shield.fill', android: 'shield' },
  sun: { ios: 'sun.max.fill', android: 'sunny' },
  cloud: { ios: 'cloud.fill', android: 'cloud' },
  like: { ios: 'heart.fill', android: 'favorite' },
  comment: { ios: 'bubble.left.fill', android: 'chat_bubble' },
  logout: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  person: { ios: 'person.fill', android: 'person' },
  pin: { ios: 'mappin.circle.fill', android: 'location_on' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh' },
  calendar: { ios: 'calendar', android: 'calendar_today' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  stop: { ios: 'stop.fill', android: 'stop' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome' },
  nutrition: { ios: 'leaf.fill', android: 'nutrition' },
  vet: { ios: 'cross.case.fill', android: 'medical_services' },
  info: { ios: 'info.circle.fill', android: 'info' },
  vaccine: { ios: 'syringe.fill', android: 'vaccines' },
  happy: { ios: 'face.smiling.fill', android: 'sentiment_satisfied' },
  emergency: { ios: 'cross.circle.fill', android: 'emergency' },
  paw: { ios: 'pawprint.fill', android: 'pets' },
} as const;

export type IconName = keyof typeof ICONS;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 22, color, weight = 'semibold', style }: Props) {
  const t = useTheme();
  const spec = ICONS[name];
  return (
    <SymbolView
      name={{ ios: spec.ios, android: spec.android, web: spec.android }}
      size={size}
      tintColor={color ?? t.text}
      weight={weight}
      style={[{ width: size, height: size }, style]}
    />
  );
}
