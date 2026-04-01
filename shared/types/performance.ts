import { SeatStatus } from './seat';

export interface SeatData {
  seatId: string;
  status: SeatStatus;
  [key: string]: any;
}

export interface PerformanceSeatsResponse {
  [section: string]: {
    [row: string]: SeatData[];
  };
}
