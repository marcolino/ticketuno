import { useState, useEffect, useCallback } from 'react';
import { pushApi } from '@/services/api';

export type PushStatus = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';
export type SubscribeResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'backend_error'; error?: unknown };

export function subscribeResultToBool(result: SubscribeResult | false): boolean {
  if (result === false) return false;
  return result.ok || result.reason === 'backend_error';
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>('unsubscribed');

  // Reflect actual browser subscription state on mount
  useEffect(() => {
    if (!isPushSupported()) { setStatus('unsupported'); return; }
    if (Notification.permission === 'denied') { setStatus('denied'); return; }
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setStatus(sub ? 'subscribed' : 'unsubscribed'));
  }, []);

  const subscribe = useCallback(async (): Promise<SubscribeResult> => {
  if (!isPushSupported()) {
    setStatus('unsupported');
    return { ok: false, reason: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setStatus('denied');
      return { ok: false, reason: 'denied' };
    }

    let vapidPublicKey: string;
    try {
      const resp = await pushApi.getVapidPublicKey();
      vapidPublicKey = resp.vapidPublicKey;
    } catch (err) {
      return { ok: false, reason: 'backend_error', error: err };
    }

    let subscription: PushSubscription;
    try {
      const reg = await navigator.serviceWorker.ready;
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    } catch (err) {
      setStatus('unsubscribed');
      return { ok: false, reason: 'backend_error', error: err };
    }

    // Browser succeeded — update checkbox before backend call
    setStatus('subscribed');

    try {
      await pushApi.subscribe(subscription.toJSON());
      return { ok: true };
    } catch (err) {
      // Browser subscription is real — checkbox stays checked
      return { ok: false, reason: 'backend_error', error: err };
    }
  }, []);
  
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await pushApi.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus('unsubscribed');
      return true;
    } catch (err) {
      console.error('[push] Unsubscribe failed:', err);
      return false;
    }
  }, []);

  return { status, subscribe, unsubscribe };
}
