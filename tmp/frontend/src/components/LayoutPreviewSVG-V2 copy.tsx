import { LayoutJSON } from "../../../shared/types/layout";
import { useMemo } from "react";
import LayoutSeat, { SeatStatus } from "./LayoutSeat";

export interface SeatWithStatus {
  seatId: string;
  sectionId: string;
  sectionName: string;
  rowId: string;
  seatNumber: number;
  x: number;
  y: number;
  status?: SeatStatus;  // Optional - for booking mode
}

interface LayoutPreviewSVGProps {
  layout: LayoutJSON;
  seats: SeatWithStatus[];  // Pre-generated seats with positions (and optionally status)
  interactive?: boolean;    // Enable click/hover for booking
  onSeatClick?: (seatId: string, currentStatus?: SeatStatus) => void;
  getSeatStatus?: (seat: SeatWithStatus) => SeatStatus;  // Custom status logic
}

const LayoutPreviewSVG: React.FC<LayoutPreviewSVGProps> = ({ 
  layout, 
  seats,
  interactive = false,
  onSeatClick,
  getSeatStatus
}) => {

  console.log("AAA LayoutPreviewSVG - layout:", layout);
  console.log(" LayoutPreviewSVG - layout:", layout);

  // Seat dimensions
  const seatWidth = 48;
  const seatHeight = 48;
  
  // Calculate bounding box of all content
  const calculateBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    // Stage bounds
    minX = Math.min(minX, layout.stage.x);
    minY = Math.min(minY, layout.stage.y);
    maxX = Math.max(maxX, layout.stage.x + layout.stage.width);
    maxY = Math.max(maxY, layout.stage.y + layout.stage.height);
    
    // Seat bounds
    seats.forEach(seat => {
      minX = Math.min(minX, seat.x - (seatWidth / 2));
      minY = Math.min(minY, seat.y - (seatHeight / 2));
      maxX = Math.max(maxX, seat.x + (seatWidth / 2));
      maxY = Math.max(maxY, seat.y + (seatHeight / 2));
    });
    
    // Section labels
    layout.sections.forEach((section) => {
      const sectionStartX = section.origin.x;
      const sectionStartY = section.origin.y;
      
      minX = Math.min(minX, sectionStartX - 100);
      maxX = Math.max(maxX, sectionStartX + 100);
      minY = Math.min(minY, sectionStartY - 70);
      maxY = Math.max(maxY, sectionStartY + 70);
    });
    
    const padding = 60;
    
    if (minX === Infinity) {
      return { minX: 0, minY: 0, width: 1000, height: 800 };
    }
    
    return {
      minX: minX - padding,
      minY: minY - padding,
      width: maxX - minX + (2 * padding),
      height: maxY - minY + (2 * padding)
    };
  }, [layout, seats, seatWidth, seatHeight]);
  
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`${calculateBounds.minX} ${calculateBounds.minY} ${calculateBounds.width} ${calculateBounds.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background */}
      <rect
        x={calculateBounds.minX}
        y={calculateBounds.minY}
        width={calculateBounds.width}
        height={calculateBounds.height}
        fill="#f5f5f5"
      />
      
      {/* Stage */}
      <rect
        x={layout.stage.x} 
        y={layout.stage.y}
        width={layout.stage.width} 
        height={layout.stage.height}
        fill="#2e2e2e"
        stroke="#000"
        strokeWidth="3"
        rx="4"
        ry="4"
      />
      <text
        x={layout.stage.x + layout.stage.width / 2}
        y={layout.stage.y + layout.stage.height / 2}
        fill="white"
        textAnchor="middle"
        fontSize="24"
        fontWeight="bold"
        style={{ userSelect: 'none' }}
        dy="0.3em"
      >
        {layout.stage.label}
      </text>

      {/* Sections */}
      {layout.sections.map((section) => {
        const sectionStartX = section.origin.x;
        const sectionStartY = section.origin.y;
        const sectionSeats = seats.filter(s => s.sectionId === section.id);

        return (
          <g key={section.id}>
            {/* Section Label */}
            <g>
              <rect
                x={sectionStartX - 60}
                y={sectionStartY - 70}
                width={120}
                height={28}
                rx="4"
                ry="4"
                fill="#3d4650"
                opacity="0.5"
              />
              <text
                x={sectionStartX}
                y={sectionStartY - 50}
                fontSize="18"
                fontWeight="bold"
                fill="white"
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {section.label}
              </text>
            </g>

            {/* Rows */}
            {section.rows.map((row, rowIndex) => {
              const rowY = sectionStartY + (rowIndex * section.rowSpacing);

              // Get all seats in this row
              const rowSeats = sectionSeats.filter(seat => seat.rowId === row.rowId);
              const firstSeatInRow = rowSeats[0];
              //const firstSeatInRow = sectionSeats.find(seat => seat.rowId === row.rowId);

              // Calculate row label X position
              const rowLabelX = firstSeatInRow 
                ? firstSeatInRow.x - (seatWidth / 2) - 40
                : sectionStartX - 70;

              // Calculate row label Y position - use first seat's Y (includes curve)
              const rowLabelY = firstSeatInRow 
                ? firstSeatInRow.y // Use actual seat Y position
                : rowY; // Fallback to base row Y if no seats
              
              return (
                <g key={`${section.id}-row-${row.rowId}`}>
                  {/* Row Label */}
                  <g>
                    <circle
                      cx={rowLabelX + 10}
                      cy={rowLabelY -2}
                      r="18"
                      fill="#3d4650"
                      opacity="0.5"
                    />
                    <text
                      x={rowLabelX + 10}
                      y={rowLabelY + 4}
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="white"
                      style={{ userSelect: 'none' }}
                    >
                      {row.rowId}
                    </text>
                  </g>

                  {/* Seats in this row */}
                  {sectionSeats
                    .filter(seat => seat.rowId === row.rowId)
                    .map(seat => {
                      const status = getSeatStatus ? getSeatStatus(seat) : (seat.status || 'available');
                      console.log("XXX - LayoutPreviewSVG - seat:", seat);
                      return (
                        <LayoutSeat
                          key={seat.seatId}
                          x={seat.x}
                          y={seat.y}
                          seatId={seat.seatId}
                          seatNumber={seat.seatNumber.toString()}
                          status={status}
                          width={seatWidth}
                          height={seatHeight}
                          interactive={interactive}
                          onClick={onSeatClick ? () => onSeatClick(seat.seatId, status) : undefined}
                        />
                      );
                    })
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
