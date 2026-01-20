import { LayoutJSON } from "../../../shared/types/layout";
import { generateSeats } from "../../../shared/types/layoutToSeats";
import { useMemo } from "react";

const LayoutPreviewSVG: React.FC<{ layout: LayoutJSON }> = ({ layout }) => {
  const seats = generateSeats(layout);
  const seatRadius = 24;
  
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
    
    // Stage label text (approximate)
    const stageTextX = layout.stage.x + layout.stage.width / 2;
    const stageTextY = layout.stage.y + 30;
    minX = Math.min(minX, stageTextX - 50); // Approx half of text width
    maxX = Math.max(maxX, stageTextX + 50);
    minY = Math.min(minY, stageTextY - 15); // Text height
    maxY = Math.max(maxY, stageTextY + 15);
    
    // Seat bounds (with radius padding)
    seats.forEach(seat => {
      minX = Math.min(minX, seat.x - seatRadius);
      minY = Math.min(minY, seat.y - seatRadius);
      maxX = Math.max(maxX, seat.x + seatRadius);
      maxY = Math.max(maxY, seat.y + seatRadius);
      
      // Seat number text (approximate)
      const seatTextWidth = 20; // Approx width of seat number
      const seatTextHeight = 10; // Approx height of seat number
      minX = Math.min(minX, seat.x - seatTextWidth/2);
      maxX = Math.max(maxX, seat.x + seatTextWidth/2);
      minY = Math.min(minY, seat.y - seatTextHeight/2);
      maxY = Math.max(maxY, seat.y + seatTextHeight/2);
    });
    
    // Section and row label bounds
    layout.sections.forEach((section, sectionIndex) => {
      const sectionStartX = section.origin.x;
      const sectionStartY = section.origin.y;
      
      // Section label (above first row)
      const sectionLabelY = sectionStartY - 36;
      minX = Math.min(minX, sectionStartX - 100); // Approx half of section label width
      maxX = Math.max(maxX, sectionStartX + 100);
      minY = Math.min(minY, sectionLabelY - 12); // Text height
      maxY = Math.max(maxY, sectionLabelY + 12);
      
      // Row labels and rows
      section.rows.forEach((row, rowIndex) => {
        const rowY = sectionStartY + (rowIndex * section.rowSpacing);
        
        // Row label (left of row)
        const firstSeatInRow = seats.find(seat => 
          seat.sectionId === section.id && seat.rowId === row.rowId
        );
        
        if (firstSeatInRow) {
          const rowLabelX = firstSeatInRow.x - 70;
          minX = Math.min(minX, rowLabelX - 20); // Row label text width
          maxX = Math.max(maxX, rowLabelX + 20);
        } else {
          // Fallback to section origin
          minX = Math.min(minX, sectionStartX - 120);
        }
        
        // Row Y position for label
        minY = Math.min(minY, rowY - 15);
        maxY = Math.max(maxY, rowY + 15);
      });
    });
    
    // Add padding to ensure nothing gets clipped
    const padding = 60;
    
    // If no content was found (empty layout), use default bounds
    if (minX === Infinity) {
      return {
        minX: 0,
        minY: 0,
        width: 1000,
        height: 800
      };
    }
    
    return {
      minX: minX - padding,
      minY: minY - padding,
      width: maxX - minX + (2 * padding),
      height: maxY - minY + (2 * padding)
    };
  }, [layout, seats]);
  
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
        fill="#f8f9fa"
      />
      
      {/* Stage */}
      <rect
        x={layout.stage.x} 
        y={layout.stage.y}
        width={layout.stage.width} 
        height={layout.stage.height}
        fill="#333"
        stroke="#000"
        strokeWidth="2"
      />
      <text
        x={layout.stage.x + layout.stage.width / 2}
        y={layout.stage.y + 30}
        fill="white"
        textAnchor="middle"
        fontSize="20"
        fontWeight="bold"
        style={{ userSelect: 'none' }}
      >
        {layout.stage.label}
      </text>

      {/* Sections */}
      {layout.sections.map((section) => {
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
              style={{ userSelect: 'none' }}
            >
              {section.label}
            </text>

            {/* Rows */}
            {section.rows.map((row, rowIndex) => {
              const rowY = sectionStartY + (rowIndex * section.rowSpacing);

              // Get first seat in this row for positioning
              const firstSeatInRow = seats.find(seat => 
                seat.sectionId === section.id && seat.rowId === row.rowId
              );
              
              const rowLabelX = firstSeatInRow 
                ? firstSeatInRow.x - 70
                : sectionStartX - 70;

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
                    style={{ userSelect: 'none' }}
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
                          stroke="#2e7d32"
                          strokeWidth="2"
                        />
                        <text
                          x={seat.x}
                          y={seat.y + (seatRadius / 3)}
                          fontSize="18"
                          fontWeight="bold"
                          textAnchor="middle"
                          fill="white"
                          style={{ userSelect: 'none' }}
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
