// SeatMapSVG.tsx
import { generateSeats } from "../../../shared/types/layoutToSeats";
import { Layout, LayoutJSON } from "../../../shared/types/layout";
import { Seat } from "../../../shared/types/theater";

interface SeatMapSVGProps {
  layout: Layout;
  seatStates: Record<string, Seat>;
  selected: string[];
  onToggle: (seatId: string) => void;
}

export function SeatMapSVG({ layout, seatStates, selected, onToggle }: SeatMapSVGProps) {
  if (!layout) return null;

  const layoutData: LayoutJSON = JSON.parse(layout.json);
  const seats = generateSeats(layoutData);

  return (
    <svg viewBox="0 0 1000 800" width="100%" height="600">
      {seats.map(seat => {
        const seatState = seatStates[seat.id]; // Seat | undefined
        const status = seatState?.status ?? 'none'; // string (e.g., 'sold' | 'available' | ...)
        const fill =
          status === 'booked'
            ? "#999"
            : selected.includes(seat.id)
            ? "#1976d2"
            : "#4caf50";

        return (
          <circle
            key={seat.id}
            cx={seat.x}
            cy={seat.y}
            r={7}
            fill={fill}
            onClick={() =>
              status === "available" && onToggle(seat.id)
            }
            style={{ cursor: "pointer" }}
          />
        );
      })}
    </svg>
  );
}
