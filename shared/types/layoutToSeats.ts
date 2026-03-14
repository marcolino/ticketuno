import { LayoutJSON } from './layout';

export type SeatStatus = 'available' | 'selected' | 'booked' | 'reserved';

export interface GeneratedSeat {
  seatId: string; // Composite: "Platea-A-1"
  sectionId: string;
  sectionName: string;
  rowId: string;
  seatNumber: number;
  x: number; // Required for SVG positioning
  y: number; // Required for SVG positioning
  status?: SeatStatus;
  specialCondition?: SpecialCondition;
}

export type SpecialCondition =
  | 'Absent' // Physically missing (column, passageway): while editing: ghost: while booking: hidden
  | 'Unavailable' // Broken / out of service
  | 'RestrictedView' // Obstructed sightline
  | 'Premium' // VIP / upsell tier
  | 'Impaired' // Reserved for wheelchair users
  | 'Staff' // Reserved for staff / press / ...
  | 'Baby' // Baby-cradle attachment seat
;

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
      
      // Get curve and stretch parameters
      const curve = row.curve || 0; // Negative = curve toward stage (up)
      const stretchFactor = row.stretch ?? 1.0;
      const seatSpacing = section.seatSpacing * (0.9 + (stretchFactor * 0.1));
      
      // Calculate total row width to center it
      const totalRowWidth = (row.seatCount - 1) * seatSpacing;
      const rowStartX = originX - (totalRowWidth / 2); // Center the row on originX
      
      // Curve scaling factor (makes curve visible)
      // At curve=50, center seats will be ~125 pixels offset
      const curveScale = 50; // Adjust this to control curve intensity

      // Generate seats for this row
      for (let seatNum = 1; seatNum <= row.seatCount; seatNum++) {
        const seatIndex = seatNum - 1; // 0-based index
        
        // Base X position (centered, left to right)
        const seatX = rowStartX + (seatIndex * seatSpacing);
        
        // Apply curve using parabolic arc
        // Distance from center of row (-0.5 to +0.5)
        const normalizedPosition = (seatIndex / (row.seatCount - 1)) - 0.5;
        
        // // Parabolic curve: y = curve * x^2
        // // Negative curve pushes seats forward (toward stage)
        // const curveOffset = curve * (normalizedPosition * normalizedPosition);
        // const seatY = rowY - curveOffset; // Subtract because negative Y is up
        
        // Parabolic curve: y = curve * scale * x^2
        // Negative curve pushes seats forward (toward stage/upward in SVG)
        const curveOffset = curve * curveScale * (normalizedPosition * normalizedPosition);
        const seatY = rowY + curveOffset; // Add because positive Y is down in SVG

        const seatId = `${sectionName}-${rowId}-${seatNum}`;
        
        seats.push({
          seatId,
          sectionId,
          sectionName,
          rowId,
          seatNumber: seatNum,
          x: seatX,
          y: seatY,
        });
      }
    });
  });

  return seats;
}

export function applyDisplayNumbers(
  seats: GeneratedSeat[],
  conditions: Record<string, string>
): (GeneratedSeat & { displayNumber: number })[] {
  const rowCounters: Record<string, number> = {};

  return seats.map(seat => {
    const rowKey = `${seat.sectionId}|${seat.rowId}`;
    if (rowCounters[rowKey] === undefined) rowCounters[rowKey] = 1;

    const isAbsent = conditions[seat.seatId] === 'Absent';
    const displayNumber = isAbsent
      ? seat.seatNumber
      : rowCounters[rowKey]++;

    return { ...seat, displayNumber };
  });
}
