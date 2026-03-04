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
  status: TheaterStatus;
  //currentLayoutId?: string;
  // totalSeats: number;
  // freeSeats: number;
}

export interface Seat {
  //id: string;
  seatId: string; // Composite: "Platea-A-1"
  sectionName: string; // "Platea"
  rowId: string; // "A"
  seatNumber: number; // 1
  status: SeatStatus;
  bookedByUserId?: string;
  bookedAt?: string;
  reservedUntil?: string;
  price?: number;
}

// export interface Row {
//   id: string;
//   seats: number;
//   startNumber: number;
//   seatStatuses?: Seat[];
// }

// export interface Section {
//   name: string;
//   rows: Row[];
// }
