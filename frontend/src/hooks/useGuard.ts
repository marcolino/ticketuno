import { useState, useCallback } from 'react';
import { ActiveBookingInfo, Action, GuardState } from '@ticketuno/shared/types/guard';
import { guardsApi } from '../services/api';

const useGuard = (type: Action, id: string | null) => {
  const [state, setState] = useState<GuardState>('idle');
  const [bookings, setBookings] = useState<ActiveBookingInfo[]>([]);

  const check = useCallback(async () => {
    if (!id) return;
    setState('checking');
    const result = await guardsApi[type](id);
    setBookings(result.bookings);
    setState(result.safe ? 'safe' : 'blocked');
  }, [type, id]);

  return { state, bookings, check };
}

export default useGuard;
