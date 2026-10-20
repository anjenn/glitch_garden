import { useEffect, useState } from 'react';

export interface ToastMessage {
  text: string;
  key: number;
}

export function StatusToast({ message }: { message: ToastMessage | null }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const handle = window.setTimeout(() => setVisible(false), 1900);
    return () => window.clearTimeout(handle);
  }, [message]);
  return (
    <div className={visible ? 'toast show' : 'toast'} id="toast" role="status" aria-live="polite">
      {message?.text ?? ''}
    </div>
  );
}
