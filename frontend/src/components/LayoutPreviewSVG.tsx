import React, { useMemo } from 'react';
import { LayoutJSON } from '@/shared/types/layout';
import type { SeatStatus } from '@/shared/types/layoutToSeats';
import LayoutSeat from './LayoutSeat';

export interface SeatWithStatus {
  seatId: string;
  sectionId: string;
  sectionName: string;
  rowId: string;
  seatNumber: number;
  x: number;
  y: number;
  status?: SeatStatus;
}

interface LayoutPreviewSVGProps {
  layout: LayoutJSON;
  seats: SeatWithStatus[];
  interactive?: boolean;
  onSeatClick?: (seatId: string, currentStatus?: SeatStatus) => void;
  getSeatStatus?: (seat: SeatWithStatus) => SeatStatus;
}

const LayoutPreviewSVG: React.FC<LayoutPreviewSVGProps> = ({ 
  layout, 
  seats,
  interactive = false,
  onSeatClick,
  getSeatStatus
}) => {
  // Seat dimensions
  const seatWidth = 48;
  const seatHeight = 48;
  
  // Calculate bounding box of all content - memoize to prevent recalculations
  const bounds = useMemo(() => {
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
  }, [layout/*, seats*/]); // Only recalculate when layout changes

  // Memoize section rendering to prevent unnecessary re-renders
  const sectionGroups = useMemo(() => {
    return layout.sections.map((section) => {
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
            const rowSeats = sectionSeats.filter(seat => seat.rowId === row.rowId);
            const firstSeatInRow = rowSeats[0];
            const rowLabelX = firstSeatInRow 
              ? firstSeatInRow.x - (seatWidth / 2) - 40
              : sectionStartX - 70;
            const rowLabelY = firstSeatInRow 
              ? firstSeatInRow.y
              : rowY;

            return (
              <g key={`${section.id}-row-${row.rowId}`}>
                {/* Row Label */}
                <g>
                  <circle
                    cx={rowLabelX + 10}
                    cy={rowLabelY - 2}
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
                {rowSeats.map(seat => {
                  const status = getSeatStatus ? getSeatStatus(seat) : (seat.status || 'available');
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
                })}
              </g>
            );
          })}
        </g>
      );
    });
  }, [layout.sections, seats, getSeatStatus, interactive, onSeatClick, seatWidth, seatHeight]);

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio="xMidYMin meet"
      style={{
        touchAction: 'pan-x pan-y', // Add touch-friendly behavior on mobile
      }}
    >
      {/* Background */}
      <rect
        x={bounds.minX}
        y={bounds.minY}
        width={bounds.width}
        height={bounds.height}
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
      {sectionGroups}
    </svg>
  );
};

// Add React.memo to prevent unnecessary re-renders
export default React.memo(LayoutPreviewSVG);
