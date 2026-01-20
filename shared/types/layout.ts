// shared/types/layout.ts
export interface Layout {
  id: string;
  name: string;
  description?: string;
  theaterId: string;
  json: string;
}

export interface LayoutJSON {
  version: 1;
  stage: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  };
  sections: SectionJSON[];
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

