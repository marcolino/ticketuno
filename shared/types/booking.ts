export type BookingStatus = 'confirmed' | 'cancelled' | 'refunded';

export interface Booking {
  id: string;
  userId: string;
  performanceId: string;
  status: BookingStatus;
  totalPrice: number;
  seatCount: number;
  seatIds: string[]; // parsed from seat_ids JSON column
  bookedAt: string;
  updatedAt?: string;
  cancelledAt?: string;
}
