export type BookingStatus = 'confirmed' | 'cancelled' | 'refunded';

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
  usedAt: Date | null;
  usedBy: string | null;
  updatedAt?: string;
  cancelledAt?: string;
}
