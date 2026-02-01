export interface Theater {
  id: string;
  name: string;
  description?: string;
  stageType?: string;
  address?: string;
  websiteUrl?: string;
  status: 'active' | 'inactive';
  currentLayoutId?: string;
  createdAt: string;
  updatedAt: string;
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
  id: string;
  number: number;
  status: 'available' | 'booked' | 'none';
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
