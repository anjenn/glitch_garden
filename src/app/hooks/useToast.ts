import { useCallback, useState } from 'react';
import type { ToastMessage } from '../../components/StatusToast.tsx';

export interface ToastApi {
  toast: ToastMessage | null;
  notice(text: string): void;
}

/** Short-lived status messages; each call gets a fresh key so repeats re-show. */
export function useToast(): ToastApi {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const notice = useCallback((text: string) => {
    setToast({ text, key: Date.now() + Math.random() });
  }, []);
  return { toast, notice };
}
