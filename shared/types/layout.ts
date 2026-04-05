import type { SeatStatus, SpecialCondition } from './seat';
import { ActiveBookingInfo } from './guard';

export type LockInfoRow = {
  eventTitle: string;
  performanceDate: string;
  startTime: string;
  booked: number;
  reserved: number;
};

export interface Layout {
  id: string;
  name: string;
  description?: string | null;
  theaterId: string;
  json: string;
  // isEditable?: boolean;
  // lockInfo?: LockInfoRow[];
  editable?: boolean;
  blockedBy?: ActiveBookingInfo[];
}

export interface StageJSON {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface LayoutJSON {
  version: 1;
  stage: StageJSON;
  sections: SectionJSON[];
  seatConditions?: Record<string, SpecialCondition>;
}

export interface SectionJSON {
  id: string; // "platea"
  label: string; // "Platea"
  origin: { x: number; y: number };
  rowSpacing: number;
  seatSpacing: number;
  rows: RowJSON[];
}

export interface RowJSON {
  rowId: string; // "A"
  seatCount: number;
  stretch?: number; // 1 = normal, >1 wider
  curve?: number; // degrees (0 = straight)
}

export interface SeatWithStatus {
  seatId: string;
  sectionId: string;
  sectionName: string;
  rowId: string;
  seatNumber: number;
  displayNumber?: number;
  x: number;
  y: number;
  status?: SeatStatus;
  specialCondition?: SpecialCondition;
}

export interface LayoutPreviewSVGProps {
  layout: LayoutJSON;
  seats: SeatWithStatus[];
  interactive?: boolean;
  onSeatClick?: (seatId: string, currentStatus?: SeatStatus) => void;
  getSeatStatus?: (seat: SeatWithStatus) => SeatStatus;
  bookingView?: boolean;
}
