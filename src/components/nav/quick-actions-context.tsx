import { createContext, useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';

export type QuickActionsApi = {
  /** 0 = closed, 1 = fully open. Driven directly by gestures for 1:1 tracking. */
  progress: SharedValue<number>;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Called from gesture end to commit the final state. */
  settle: (open: boolean) => void;
};

export const QuickActionsContext = createContext<QuickActionsApi | null>(null);

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error('useQuickActions must be used inside the tabs layout');
  return ctx;
}
