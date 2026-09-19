import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

/** Block a back swipe on a dirty form so a filled sheet cannot vanish silently. */
export function useDiscardGuard(dirty: boolean, title = 'Leave without saving?') {
  const navigation = useNavigation();

  useEffect(() => {
    if (!dirty) return;
    const sub = navigation.addListener('beforeRemove', (e) => {
      e.preventDefault();
      Alert.alert(title, 'What you typed is not saved yet.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return sub;
  }, [dirty, navigation, title]);
}
