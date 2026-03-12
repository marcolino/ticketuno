import { SpecialCondition } from '../../shared/types/layoutToSeats';

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
  isEditable?: boolean;
  lockInfo?: LockInfoRow[];
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

