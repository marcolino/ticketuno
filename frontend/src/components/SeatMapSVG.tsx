// SeatMapSVG.tsx
import { generateSeats } from "../../../shared/types/layoutToSeats";

export function SeatMapSVG({ layout, seatStates, selected, onToggle }) {
  if (!layout) return null;

  const seats = generateSeats(layout);

  return (
    <svg viewBox="0 0 1000 800" width="100%" height="600">
      {seats.map(seat => {
        const status = seatStates[seat.id];
        const fill =
          status === "sold"
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
