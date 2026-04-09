export type TheaterStatus = 'active' | 'inactive';
export type SeatStatus = 'available' | 'reserved' | 'booked';
export type EventStatus = 'scheduled' | 'in progress' | 'completed' | 'canceled';

export interface Theater {
  id: string;
  name: string;
  description?: string;
  stageType?: string;
  address?: string;
  websiteUrl?: string;
  contactPhone?: string,
  contactEmail?: string,
  status: TheaterStatus;
  currentLayoutId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TheaterStats { // TODO: dispose TheaterStats, use Theater...
  id: string;
  name: string;
  description?: string;
  stageType?: string;
  address?: string;
  websiteUrl?: string;
  constactPhone?: string,
  constactEmail?: string,
  status: TheaterStatus;
}

export interface Seat {
  seatId: string; // Composite: "Platea-A-1"
  sectionName: string; // "Platea"
  rowId: string; // "A"
  seatNumber: number; // 1
  status: SeatStatus;
  price?: number;
  bookingId?: string;
  bookingRef: string | null; 
  bookedByUserId?: string;
  bookedAt?: string;
  reservedUntil?: string;
}

export interface TheaterConflictDetails {
  performanceDate: string;
  requestedStartTime: string;
  requestedEndTime: string;
  existingPerformanceStartTime: string;
  existingPerformanceEndTime: string | null;
  theaterId: string;
  theaterName: string | null;
}
