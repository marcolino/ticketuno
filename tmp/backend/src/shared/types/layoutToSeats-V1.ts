import { LayoutJSON } from './layout';
//import { SeatStatus } from "../../components/LayoutSeat";

export type SeatStatus = 'available' | 'selected' | 'booked' | 'reserved';

export interface GeneratedSeat {
  seatId: string; // Composite: "Platea-A-1"
  sectionId: string,
  sectionName: string;
  rowId: string;
  seatNumber: number;
  x?: number; // Optional: for visual positioning
  y?: number; // Optional: for visual positioning
}

export interface GeneratedSeat {
  seatId: string;
  sectionId: string;
  sectionName: string;
  rowId: string;
  seatNumber: number;
  x?: number; // Required for SVG positioning
  y?: number; // Required for SVG positioning
  status?: SeatStatus;
}

export function generateSeats(layout: LayoutJSON): GeneratedSeat[] {
  const seats: GeneratedSeat[] = [];

  layout.sections.forEach(section => {
    const sectionId = section.id;
    const sectionName = section.label || section.id;
    const originX = section.origin.x;
    const originY = section.origin.y;

    section.rows.forEach((row, rowIndex) => {
      const rowId = row.rowId;
      
      // Calculate row Y position
      const rowY = originY + (rowIndex * section.rowSpacing);
      
      // Apply curve effect (seats fan out)
      const curveAngle = (row.curve || 0) * Math.PI / 180; // Convert to radians
      const stretchFactor = row.stretch || 1.0;
      
      // Generate seats for this row
      for (let seatNum = 1; seatNum <= row.seatCount; seatNum++) {
        const seatIndex = seatNum - 1; // 0-based
        const seatSpacing = section.seatSpacing * stretchFactor;
        
        // Base X position (left to right)
        let seatX = originX + (seatIndex * seatSpacing);
        
        // Apply curve (arc effect)
        const curveOffset = Math.sin(seatIndex * 0.3 + curveAngle) * 20;
        seatX += curveOffset;
        
        const seatId = `${sectionName}-${rowId}-${seatNum}`;
        
        seats.push({
          seatId,
          sectionId,
          sectionName,
          rowId,
          seatNumber: seatNum,
          x: seatX, // X position calculated
          y: rowY, // Y position calculated
        });
      }
    });
  });

  return seats;
}

// Helper to parse composite seat ID back into parts
export function parseSeatId(seatId: string): { 
  sectionName: string; 
  rowId: string; 
  seatNumber: number; 
} {
  const parts = seatId.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid seat ID format: ${seatId}`);
  }
  
  return {
    sectionName: parts[0],
    rowId: parts[1],
    seatNumber: parseInt(parts[2], 10)
  };
}
