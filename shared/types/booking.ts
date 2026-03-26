export type BookingStatus = 'confirmed' | 'canceled' | 'refunded';

export interface Booking {
  id: string;
  bookingRef: string;
  userId: string;
  holderName?: string;
  performanceId: string;
  status: BookingStatus;
  totalPrice: number;
  seatCount: number;
  seatIds: string[]; // parsed from seat_ids JSON column
  bookedAt: string;
  scannedAt: Date | null;
  scannedBy: string | null;
  updatedAt?: string;
  canceledAt?: string;
}

export interface BookingQueryOptions {
  status?: BookingStatus | 'all';
}
