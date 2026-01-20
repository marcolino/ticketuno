import { LayoutJSON } from "../../../shared/types/layout";
import { generateSeats } from "../../../shared/types/layoutToSeats";

const LayoutPreviewSVG: React.FC<{ layout: LayoutJSON }> = ({ layout }) => {
  const seats = generateSeats(layout);
  const seatRadius = 24;

  return (
    <svg width="100%" height="600" viewBox="0 0 1000 800">
      {/* Stage */}
      <rect
        x={layout.stage.x} 
        y={layout.stage.y} // Use responsive Y
        width={layout.stage.width} 
        height={layout.stage.height}
        fill="#333"
      />
      <text
        x={layout.stage.x + layout.stage.width / 2}
        y={layout.stage.y + 30}
        fill="white"
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
      >
        {layout.stage.label}
      </text>

      {/* Sections */}
      {layout.sections.map((section, index) => {
        const sectionStartX = section.origin.x;
        const sectionStartY = section.origin.y;
        
        return (
          <g key={section.id}>
            {/* Section Label - above first row */}
            <text
              x={sectionStartX}
              y={sectionStartY - 36}
              fontSize="24"
              fontWeight="bold"
              fill="#333"
              textAnchor="middle"
            >
              {section.label}
            </text>

            {/* Rows */}
            {section.rows.map((row, rowIndex) => {
              const rowY = sectionStartY + (rowIndex * section.rowSpacing);
              console.log("SEATS:", seats);

              // Get first seat in this row for positioning
              const firstSeatInRow = seats.find(seat => 
                seat.sectionId === section.id && seat.rowId === row.rowId
              );
              
              const rowLabelX = firstSeatInRow 
                ? firstSeatInRow.x - 70 // 50px left of first seat
                : sectionStartX - 70; // fallback to section origin

              return (
                <g key={`${section.id}-row-${row.rowId}`}>
                  {/* Row Label - left of row */}
                  <text
                    x={rowLabelX + 7}
                    y={rowY + seatRadius / 3}
                    fontSize="22"
                    fontWeight="bold"
                    textAnchor="end"
                    fill="darkblue"
                  >
                    {row.rowId}
                  </text>

                  {/* Seats for this row */}
                  {seats
                    .filter(seat => seat.sectionId === section.id && seat.rowId === row.rowId)
                    .map(seat => (
                      <g key={seat.id}>
                        <circle 
                          cx={seat.x} 
                          cy={seat.y} 
                          r={seatRadius} 
                          fill="#4caf50" 
                        />
                        <text
                          x={seat.x}
                          y={seat.y + (seatRadius / 3)}
                          fontSize="18"
                          fontWeight="bold"
                          textAnchor="middle"
                          fill="white"
                        >
                          {seat.seatNumber}
                        </text>
                      </g>
                    ))
                  }
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

export default LayoutPreviewSVG;
