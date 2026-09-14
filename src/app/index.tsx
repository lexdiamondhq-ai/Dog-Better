import { View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Placeholder while the Gate in the root layout decides where to send the user. */
export default function Index() {
  const t = useTheme();
  return <View style={{ flex: 1, backgroundColor: t.bg }} />;
}
