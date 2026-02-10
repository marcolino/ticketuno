export interface Theater {
  id: string;
  name: string;
  description?: string;
  stageType?: string;
  address?: string;
  websiteUrl?: string;
  status: 'active' | 'inactive';
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
  status: 'active' | 'inactive';
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
  status: 'available' | 'reserved' | 'booked';
  bookedByUserId?: string;
  bookedAt?: string;
  reservedUntil?: string;
  price?: number;
}

export interface Row {
  id: string;
  seats: number;
  startNumber: number;
  seatStatuses?: Seat[];
}

export interface Section {
  name: string;
  rows: Row[];
}
