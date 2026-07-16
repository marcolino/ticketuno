// status column — booking lifecycle, revert to original 4 values
export type BookingStatus = 'pending_payment' | 'confirmed' | 'canceled' | 'refunded';

// payment_status column — payment lifecycle, new dedicated type
export type BookingPaymentStatus = 'pending' | 'paid' | 'cash_due' | 'not_required' | 'refunded';

export interface Booking {
  id: string;
  bookingRef: string;
  userId: string;
  holderName?: string;
  performanceId: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  totalPrice: number;
  seatCount: number;
  seatIds: string[]; // parsed from seat_ids JSON column
  paymentIntentId: string | null;
  bookedAt: string;
  scannedAt: Date | null;
  scannedBy: string | null;
  updatedAt?: string;
  canceledAt?: string;
  confirmationEmailSentAt?: string | null;
}

export interface BookingQueryOptions {
  status?: BookingStatus | 'all';
}

export interface BookingEnriched {
  id: string;
  bookingRef: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  userPhone: string;
  performanceId: string;
  performanceDate: string;
  startTime: string;
  endTime: string | null;
  eventId: string;
  eventTitle: string;
  currency: string;
  theaterId: string;
  theaterName: string;
  status: BookingStatus;
  paymentStatus: BookingPaymentStatus;
  totalPrice: number;
  seatCount: number;
  seatIds: string[];
  bookedAt: string;
  scannedAt: string | null;
  scannedBy: string | null;
  canceledAt: string | null;
  updatedAt: string | null;
  confirmationEmailSentAt: string | null;
}
 
export interface SeatDetail {
  seatId: string;
  bookingRef: string;  // per-seat QR ticket ref
  sectionName: string;
  rowId: string;
  seatNumber: number;
  price: number;
  eventPrice: number;
  eventCurrency: string;
}
 
export interface BookingDetail extends BookingEnriched {
  seat: SeatDetail | null;  // null only if seat row was somehow deleted
}
