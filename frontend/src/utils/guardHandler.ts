import { createElement } from 'react';
import { ShowDialog } from '@/contexts/DialogContext';
import { GuardHandlerResult, GuardedResult, /*GuardedEditResult, */SuccessKey, Action } from '@/shared/types/guard';
import ActiveBookingsWarning from '@/components/ActiveBookingsWarning';

const reasonMessages: Record<string, string> = {
  USER_HAS_ACTIVE_BOOKINGS: 'user has active bookings',
  USER_NOT_FOUND: 'user was not found',
  THEATER_HAS_ACTIVE_BOOKINGS: 'theater has active bookings',
  THEATER_NOT_FOUND: 'theater was not found',
  EVENT_HAS_ACTIVE_BOOKINGS: 'event has active bookings',
  EVENT_NOT_FOUND: 'event was not found',
  PERFORMANCE_HAS_ACTIVE_BOOKINGS: 'performance has active bookings',
  PERFORMANCE_NOT_FOUND: 'performance was not found',
  LAYOUT_HAS_ACTIVE_BOOKINGS: 'layout has active bookings',
  LAYOUT_NOT_FOUND: 'layout was not found',
};

export async function handleGuardResult(
  result: GuardedResult,
  successKey: SuccessKey,
  action: Action,
  showDialog: ShowDialog,
  toast: any,
  t: (key: string, opts?: Record<string, unknown>) => string,
  onCancel?: () => void,
): Promise<GuardHandlerResult> {
  // Explicit success flag (e.g., editable: true)
  const explicitSuccess = !!(result as any)[successKey];
  // If response has an 'id' and no block/reason, consider it success
  const hasEntityId = !!(result as any).id && !result.blockedBy?.length && !result.reason;

  if (explicitSuccess || hasEntityId) {
    return { success: true, wasBlocked: false };
  }

  if (result.blockedBy?.length) {
    const verb = successKey === 'editable' ? 'edit' : 'delete';
    const confirmed = await showDialog({
      title: t('Active bookings exist'),
      content: createElement(ActiveBookingsWarning, { bookings: result.blockedBy, action, verb }),
      confirmText: successKey === 'editable' ? t('Continue') : t('Handle bookings'),
      cancelText: t('Cancel'),
      shrinkToContent: true,
      mode: 'warning',
    });
    if (!confirmed) {
      if (onCancel) onCancel();
      return { success: false, wasBlocked: false, canceled: true };
    }
    return { success: false, wasBlocked: true };
  }

  const message = result.reason
    ? t(reasonMessages[result.reason] ?? result.reason)
    : t('Unknown error');
  toast.error(message);
  return { success: false, wasBlocked: false };
}
