import { LayoutJSON } from './layout';
export interface GeneratedSeat {
  id: string;
  sectionId: string;
  rowId: string;
  seatNumber: number;
  x: number;
  y: number;
}

export function generateSeats(layout: LayoutJSON): GeneratedSeat[] {
  const seats: GeneratedSeat[] = [];

  layout.sections.forEach(section => {
    let y = section.origin.y;

    section.rows.forEach(row => {
      const spacing = section.seatSpacing * (row.stretch ?? 1);
      const width = (row.seatCount - 1) * spacing;
      const startX = section.origin.x - width / 2;

      for (let i = 0; i < row.seatCount; i++) {
        let x = startX + i * spacing;

        // curvature (safe, optional)
        if (row.curve) {
          const t = (i / (row.seatCount - 1)) - 0.5;
          y += Math.sin(t * Math.PI) * row.curve;
        }

        seats.push({
          id: `${section.id}-${row.rowId}-${i + 1}`,
          sectionId: section.id,
          rowId: row.rowId,
          seatNumber: i + 1,
          x,
          y
        });
      }

      y += section.rowSpacing;
    });
  });

  return seats;
}
