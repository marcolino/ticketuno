import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { jwtDecode } from "jwt-decode";
import { useDialog } from '@/contexts/DialogContext';

interface JwtPayload {
  exp: number;
}

interface Props {
  token: string | null;
  logout: () => void;
}

const WARNING_BEFORE = 5 * 60 * 1000; // 5 minutes

export default function useSessionManager({ token, logout }: Props) {
  const { t } = useTranslation();
  const showDialog = useDialog();

  // const warningTimer = useRef<NodeJS.Timeout | null>(null);
  // const expirationTimer = useRef<NodeJS.Timeout | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expirationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (expirationTimer.current) clearTimeout(expirationTimer.current);
  };

  const getExpiration = (token: string): number | null => {
    try {
      const decoded = jwtDecode<JwtPayload>(token);
      return decoded.exp * 1000;
    } catch {
      return null;
    }
  };

  const handleExpired = (boot = false) => {
    clearTimers();

    showDialog({
      title: 'Session expired',
      content: boot
        ? 'Your session expired while you were away. Please login again.'
        : 'Your session has expired. Please login again.',
      confirmText: 'Login',
      onConfirm: logout,
    });
  };

  const schedule = (token: string) => {
    clearTimers();

    const expiration = getExpiration(token);
    if (!expiration) return;

    const now = Date.now();
    const timeLeft = expiration - now;

    if (timeLeft <= 0) {
      handleExpired(true);
      return;
    }

    // 5-minute warning
    if (timeLeft > WARNING_BEFORE) {
      warningTimer.current = setTimeout(() => {
        showDialog({
          title: 'Session expiring soon',
          content: t('Your session will expire in {{minutes}} minutes. Please save your work.', {minutes: 5}), // TODO: to config
          confirmText: 'OK',
          //hideCancel: true,
        });
      }, timeLeft - WARNING_BEFORE);
    }

    // Expiration
    expirationTimer.current = setTimeout(() => {
      handleExpired(false);
    }, timeLeft);
  };

  useEffect(() => {
    if (!token) {
      clearTimers();
      return;
    }

    schedule(token);

    return clearTimers;
  }, [token]);
}
