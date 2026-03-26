import { DialogOptions } from '@/shared/types/dialog';
import { ShowDialog } from '@/contexts/DialogContext';
import { GuardedDeleteResult, GuardedUpdateResult, GuardHandlerResult } from '@/shared/types/guard';
import ActiveBookingsWarning from '@/components/ActiveBookingsWarning';
import { createElement } from 'react';

type GuardedResult = GuardedDeleteResult | GuardedUpdateResult;
type SuccessKey = 'deleted' | 'updated' | 'canceled';

const reasonMessages: Record<string, string> = {
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
  showDialog: ShowDialog,
  toast: any,
  t: (key: string, opts?: Record<string, unknown>) => string,
): Promise<GuardHandlerResult> {
  const succeeded = !!(result as any)[successKey];
  if (succeeded) return { success: true, wasBlocked: false };

  if (result.blockedBy?.length) {
    const confirmed = await showDialog({
      title: t('Active Bookings Exist'),
      content: createElement(ActiveBookingsWarning, { bookings: result.blockedBy }),
      confirmText: t('Handle bookings'),
      cancelText: t('Cancel'),
      shrinkToContent: true,
    });
    return { success: false, wasBlocked: confirmed }; // only true if user clicked confirm ("Handle bookings")
  }

  const message = result.reason
    ? t(reasonMessages[result.reason] ?? result.reason)
    : t('Unknown error');
  toast.error(message);
  return { success: false, wasBlocked: false };
}
