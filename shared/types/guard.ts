export type GuardReason =
  | 'THEATER_HAS_ACTIVE_BOOKINGS'
  | 'THEATER_NOT_FOUND'
  | 'EVENT_HAS_ACTIVE_BOOKINGS'
  | 'EVENT_NOT_FOUND'
  | 'PERFORMANCE_HAS_ACTIVE_BOOKINGS'
  | 'PERFORMANCE_NOT_FOUND'
  | 'LAYOUT_HAS_ACTIVE_BOOKINGS'
  | 'LAYOUT_NOT_FOUND'
  | 'USER_HAS_ACTIVE_BOOKINGS'
  | 'USER_NOT_FOUND'   
;

export interface GuardedDeleteResult {
  deleted: boolean;
  reason?: GuardReason;
  blockedBy?: ActiveBookingInfo[];
}

export interface GuardedDeleteResultBulk {
  results: Record<string, GuardedDeleteResult>;
  deleted: number; // count of successfully deleted
  blocked: number; // count of blocked/failed
}

export interface GuardedUpdateResult {
  updated: boolean;
  reason?: GuardReason;
  blockedBy?: ActiveBookingInfo[];
}

export interface GuardHandlerResult {
  success: boolean;
  wasBlocked: boolean;
}

export interface ActiveBookingInfo {
  bookingId: string;
  bookingRef: string;
  performanceId: string;
  performanceDate: string;
  startTime: string;
  eventId: string;
  eventTitle: string;
  theaterName: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  seatIds: string[];
  totalPrice: number;
}

export interface GuardResult {
  safe: boolean;
  bookings: ActiveBookingInfo[];
}
