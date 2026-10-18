'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Keep form feedback above overlays and outside transformed/scrolling containers. */
export default function FeedbackToast({ message, type = 'error', onDismiss }: {
  message?: string | null;
  type?: 'success' | 'error';
  onDismiss: () => void;
}) {
  const mounted = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  if (!mounted || !message) return null;
  const Icon = type === 'error' ? AlertCircle : CheckCircle2;
  return createPortal(
    <div role={type === 'error' ? 'alert' : 'status'} aria-atomic="true" data-feedback-toast
      className={`fixed top-4 right-4 left-4 z-[1000] flex max-h-[calc(100dvh-2rem)] items-start gap-3 overflow-y-auto rounded-2xl border p-4 text-sm font-semibold shadow-xl sm:left-auto sm:w-full sm:max-w-md ${
        type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
      }`}>
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1 break-words">{message}</span>
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss}
        className="shrink-0 rounded-md p-1 hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2">
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>, document.body,
  );
}
