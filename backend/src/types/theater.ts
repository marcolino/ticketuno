export interface Seat {
  id: string;
  number: number;
  status: 'available' | 'booked';
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

export interface Theater {
  id: string;
  name: string;
  description?: string;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface TheaterStats {
  id: string;
  name: string;
  totalSeats: number;
  freeSeats: number;
}
