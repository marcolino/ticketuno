import { LayoutJSON } from "../../../shared/types/layout";
import { generateSeats } from "../../../shared/types/layoutToSeats";

const LayoutPreviewSVG: React.FC<{ layout: LayoutJSON }> = ({ layout }) => {
  const seats = generateSeats(layout);

  const seatRadius = 24;
  return (
    <svg width="100%" height="600" viewBox="0 0 1000 800">
      {/* Stage */}
      <rect {...layout.stage} fill="#333" />
      <text
        x={layout.stage.x + layout.stage.width / 2}
        y={layout.stage.y + 30}
        fill="white"
        textAnchor="middle"
      >
        {layout.stage.label}
      </text>

      {/* Seats */}
      {seats.map(seat => (
        <g key={seat.id}>
          <circle cx={seat.x} cy={seat.y} r={seatRadius} fill="#4caf50" />
          <text
            x={seat.x}
            y={seat.y + (seatRadius/3)}
            fontSize="18"
            fontWeight="bold"
            textAnchor="middle"
            fill="white"
          >
            {seat.seatNumber}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default LayoutPreviewSVG;
