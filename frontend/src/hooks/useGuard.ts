import { useState, useCallback } from 'react';
import { ActiveBookingInfo } from '../shared/types/guard';
import { guardsApi } from '../services/api';

type GuardState = 'idle' | 'checking' | 'safe' | 'blocked';

const useGuard = (type: 'performance' | 'event' | 'theater' | 'layout', id: string | null) => {
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
