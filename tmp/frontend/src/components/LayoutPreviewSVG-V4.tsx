import { LayoutJSON } from "../../../shared/types/layout";
import { generateSeats } from "../../../shared/types/layoutToSeats";
import { useMemo } from "react";

const LayoutPreviewSVG: React.FC<{ layout: LayoutJSON }> = ({ layout }) => {
  const seats = generateSeats(layout);
  
  // Seat dimensions
  const seatWidth = 48;  // Total seat width including armrests
  const seatHeight = 48; // Total seat height including backrest
  const seatBaseHeight = 32; // Height of the seat base (cushion part)
  const seatBaseWidth = 40; // Width of the seat base
  const backrestHeight = 16; // Height of the backrest
  const armrestWidth = 4; // Width of each armrest
  const armrestHeight = 28; // Height of armrests
  
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
    minX = Math.min(minX, stageTextX - 50);
    maxX = Math.max(maxX, stageTextX + 50);
    minY = Math.min(minY, stageTextY - 15);
    maxY = Math.max(maxY, stageTextY + 15);
    
    // Seat bounds (with full seat dimensions)
    seats.forEach(seat => {
      // Seat extends half width/height from center
      minX = Math.min(minX, seat.x - (seatWidth / 2));
      minY = Math.min(minY, seat.y - (seatHeight / 2));
      maxX = Math.max(maxX, seat.x + (seatWidth / 2));
      maxY = Math.max(maxY, seat.y + (seatHeight / 2));
      
      // Seat number text (approximate)
      const seatTextWidth = 20;
      const seatTextHeight = 10;
      minX = Math.min(minX, seat.x - seatTextWidth/2);
      maxX = Math.max(maxX, seat.x + seatTextWidth/2);
      minY = Math.min(minY, seat.y - seatTextHeight/2);
      maxY = Math.max(maxY, seat.y + seatTextHeight/2);
    });
    
    // Section and row label bounds
    layout.sections.forEach((section) => {
      const sectionStartX = section.origin.x;
      const sectionStartY = section.origin.y;
      
      // Section label (above first row)
      const sectionLabelY = sectionStartY - 36;
      minX = Math.min(minX, sectionStartX - 100);
      maxX = Math.max(maxX, sectionStartX + 100);
      minY = Math.min(minY, sectionLabelY - 12);
      maxY = Math.max(maxY, sectionLabelY + 12);
      
      // Row labels and rows
      section.rows.forEach((row, rowIndex) => {
        const rowY = sectionStartY + (rowIndex * section.rowSpacing);
        
        // Row label (left of row)
        const firstSeatInRow = seats.find(seat => 
          seat.sectionId === section.id && seat.rowId === row.rowId
        );
        
        if (firstSeatInRow) {
          const rowLabelX = firstSeatInRow.x - (seatWidth / 2) - 25; // 25px left of first seat
          minX = Math.min(minX, rowLabelX - 20);
          maxX = Math.max(maxX, rowLabelX + 20);
        } else {
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
  
  // Theater seat colors
  const seatBaseColor = "#711324";     // Dark red for seat base
  const seatBackrestColor = "#8B1E3F"; // Slightly lighter red for backrest
  const armrestColor = "#5A1520";      // Darker red for armrests
  const seatTextColor = "#FFFFFF";     // White text for contrast
  
  // Function to render a single seat
  const renderSeat = (seat: any) => {
    const seatX = seat.x;
    const seatY = seat.y;
    
    return (
      <g key={seat.id}>
        {/* Seat Base (Cushion) - rectangle with beveled corners */}
        <rect
          x={seatX - seatBaseWidth / 2}
          y={seatY - seatBaseHeight / 2}
          width={seatBaseWidth}
          height={seatBaseHeight}
          rx={6} // Rounded corners for beveled look
          ry={6}
          fill={seatBaseColor}
          stroke="#5A1520"
          strokeWidth="1.5"
        />
        
        {/* Backrest - top part of seat */}
        <rect
          x={seatX - seatBaseWidth / 2 + 2}
          y={seatY - seatHeight / 2}
          width={seatBaseWidth - 4}
          height={backrestHeight}
          rx={4}
          ry={4}
          fill={seatBackrestColor}
          stroke="#5A1520"
          strokeWidth="1.5"
        />
        
        {/* Left Armrest */}
        <rect
          x={seatX - seatWidth / 2}
          y={seatY - armrestHeight / 2}
          width={armrestWidth}
          height={armrestHeight}
          rx={1}
          ry={1}
          fill={armrestColor}
          stroke="#3D0F16"
          strokeWidth="1"
        />
        
        {/* Right Armrest */}
        <rect
          x={seatX + seatWidth / 2 - armrestWidth}
          y={seatY - armrestHeight / 2}
          width={armrestWidth}
          height={armrestHeight}
          rx={1}
          ry={1}
          fill={armrestColor}
          stroke="#3D0F16"
          strokeWidth="1"
        />
        
        {/* Decorative stitching on seat base */}
        {/* <line
          x1={seatX - seatBaseWidth / 2 + 8}
          x2={seatX + seatBaseWidth / 2 - 8}
          y1={seatY}
          y2={seatY}
          stroke="#D4A76A"
          strokeWidth="1"
          strokeDasharray="3,3"
        /> */}
        
        {/* Seat Number */}
        <text
          x={seatX}
          y={seatY + 5}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          fill={seatTextColor}
          style={{ userSelect: 'none' }}
        >
          {seat.seatNumber}
        </text>
      </g>
    );
  };
  
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`${calculateBounds.minX} ${calculateBounds.minY} ${calculateBounds.width} ${calculateBounds.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Light background */}
      <rect
        x={calculateBounds.minX}
        y={calculateBounds.minY}
        width={calculateBounds.width}
        height={calculateBounds.height}
        fill="#f5f5f5"
      />
      
      {/* Grid lines for better orientation */}
      {/* <defs>
        <pattern
          id="grid"
          x={calculateBounds.minX}
          y={calculateBounds.minY}
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 100 0 L 0 0 0 100"
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        </pattern>
      </defs> */}
      {/* <rect
        x={calculateBounds.minX}
        y={calculateBounds.minY}
        width={calculateBounds.width}
        height={calculateBounds.height}
        fill="url(#grid)"
      /> */}
      
      {/* Stage */}
      <rect
        x={layout.stage.x} 
        y={layout.stage.y}
        width={layout.stage.width} 
        height={layout.stage.height}
        fill="#1a1a1a"
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
      
      {/* Decorative stage border */}
      {/* <rect
        x={layout.stage.x - 5}
        y={layout.stage.y - 5}
        width={layout.stage.width + 10}
        height={layout.stage.height + 10}
        fill="none"
        stroke="#8B4513"
        strokeWidth="2"
        rx="6"
        ry="6"
      /> */}

      {/* Sections */}
      {layout.sections.map((section) => {
        const sectionStartX = section.origin.x;
        const sectionStartY = section.origin.y;
        
        return (
          <g key={section.id}>
            {/* Section Label - above first row */}
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

              // Get first seat in this row for positioning
              const firstSeatInRow = seats.find(seat => 
                seat.sectionId === section.id && seat.rowId === row.rowId
              );
              
              const rowLabelX = firstSeatInRow 
                ? firstSeatInRow.x - (seatWidth / 2) - 40
                : sectionStartX - 70;

              return (
                <g key={`${section.id}-row-${row.rowId}`}>
                  {/* Row Label - left of row */}
                  <g>
                    <circle
                      cx={rowLabelX + 10}
                      cy={rowY -2}
                      r="18"
                      fill="#2c3e50"
                      opacity="0.5"
                    />
                    <text
                      x={rowLabelX + 10}
                      y={rowY +4}
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                      fill="white"
                      style={{ userSelect: 'none' }}
                    >
                      {row.rowId}
                    </text>
                  </g>

                  {/* Seats for this row */}
                  {seats
                    .filter(seat => seat.sectionId === section.id && seat.rowId === row.rowId)
                    .map(seat => renderSeat(seat))
                  }
                  
                  {/* Row guideline (optional, for visual alignment) */}
                  {/* <line
                    x1={rowLabelX + 35}
                    x2={rowLabelX + 35 + (section.rows[rowIndex]?.seatCount || 0) * section.seatSpacing}
                    y1={rowY}
                    y2={rowY}
                    stroke="#b0b0b0"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    opacity="0.5"
                  /> */}
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
