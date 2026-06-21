import React, { useMemo } from 'react';
//import { useMediaQuery, useTheme } from '@mui/material';
//import { LayoutJSON } from '@ticketuno/shared/types/layout';
//import type { SeatStatus, SpecialCondition } from '@ticketuno/shared/utils/layoutToSeats';
import type { /*SeatWithStatus,*/ LayoutPreviewSVGProps } from '@ticketuno/shared/types/layout';
import LayoutSeat from './LayoutSeat';

// export interface SeatWithStatus {
//   seatId: string;
//   sectionId: string;
//   sectionName: string;
//   rowId: string;
//   seatNumber: number;
//   displayNumber?: number;
//   x: number;
//   y: number;
//   status?: SeatStatus;
//   specialCondition?: SpecialCondition;
// }

// interface LayoutPreviewSVGProps {
//   layout: LayoutJSON;
//   seats: SeatWithStatus[];
//   interactive?: boolean;
//   onSeatClick?: (seatId: string, currentStatus?: SeatStatus) => void;
//   getSeatStatus?: (seat: SeatWithStatus) => SeatStatus;
//   bookingView?: boolean;
// }

const LayoutPreviewSVG: React.FC<LayoutPreviewSVGProps> = ({ 
  layout, 
  seats,
  interactive = false,
  onSeatClick,
  getSeatStatus,
  bookingView = false,
}) => {
  //const theme = useTheme();
  //const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // Zoom factor / zoom
  //const zoom = isMobile ? 1.0 : 0.75;
  const zoom = 1;

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
    
    // REMOVE THIS: it causes big empry space on bottom in mobile mode
    // // Section labels
    // layout.sections.forEach((section) => {
    //   const sectionStartX = section.origin.x;
    //   const sectionStartY = section.origin.y;
      
    //   minX = Math.min(minX, sectionStartX - 100);
    //   maxX = Math.max(maxX, sectionStartX + 100);
    //   minY = Math.min(minY, sectionStartY - 70);
    //   maxY = Math.max(maxY, sectionStartY + 70);
    // });
    
    //const padding = 60;
    // const paddingX = 60;
    // const paddingY = isMobile ? 50 : -75;
    
    // if (minX === Infinity) {
    //   return { minX: 0, minY: 0, width: 1000, height: 800 };
    // }
    
    // return {
    //   minX: minX - paddingX,
    //   minY: minY - paddingY,
    //   width: maxX - minX + (2 * paddingX),
    //   height: maxY - minY + (2 * paddingY)
    // };

    const paddingX = 60;
    const paddingY = 50;

    return {
      minX: minX - paddingX,
      minY: minY - paddingY,
      width:  maxX - minX + (2 * paddingX),
      height: maxY - minY + (2 * paddingY)  // background now fully covers all seats
    };
  }, [layout/*, seats*/]); // Only recalculate when layout changes

  // Memoize section rendering to prevent unnecessary re-renders
  const sectionGroups = useMemo(() => {
    return layout.sections.map((section) => {
      const sectionStartX = section.origin.x;
      const sectionStartY = section.origin.y;
      const sectionSeats = seats.filter(s => s.sectionId === section.id);

      return (
        <g
          key={section.id}
          //transform={`scale(${zoom})`}
        >
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
                    opacity="0.25"
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
                      //seatNumber={seat.seatNumber.toString()}
                      seatNumber={(seat.displayNumber ?? seat.seatNumber).toString()}
                      status={status}
                      //resolvedStatus={getSeatStatus ? getSeatStatus(seat) : undefined}
                      width={seatWidth}
                      height={seatHeight}
                      interactive={interactive}
                      specialCondition={seat.specialCondition}
                      bookingView={bookingView}
                      onClick={onSeatClick ? () => {
                        onSeatClick(seat.seatId, status);
                        // // Fix mobile `:active` state not releasing after tap
                        // setTimeout(() => {
                        //   (document.activeElement as HTMLElement | SVGAElement)?.blur?.();
                        // }, 200); // after 'grow' animation completes
                      }: undefined}
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

  const viewWidth = bounds.width / zoom;
  const viewHeight = bounds.height / zoom;
  const viewMinX = bounds.minX - (viewWidth - bounds.width) / 2;
  const viewMinY = bounds.minY - (viewHeight - bounds.height) / 2;

  return (
    <div
      style={{
        width: '100%',
        //height: '100%',
        //height: isMobile ? 'auto' : '70vh',
        //height: 'auto',
        overflow: 'auto',
        display: 'flex',
        justifyContent: 'center', // horizontal centering
        //alignItems: 'flex-start', // keep top aligned
        //alignItems: 'center',
      }}
    >
      <svg 
        width="100%" 
        //height="auto"
        // viewBox={`
        //   ${bounds.minX}
        //   ${bounds.minY}
        //   ${bounds.width / zoom}
        //   ${bounds.height / zoom}
        // `}
        viewBox={`${viewMinX} ${viewMinY} ${viewWidth} ${viewHeight}`}
        //preserveAspectRatio="xMidYMin meet"
        preserveAspectRatio="xMidYMid meet"
        style={{
          touchAction: 'pan-x pan-y', // Add touch-friendly behavior on mobile
        }}
        //onTouchStart={() => {}} // Tells the browser this element handles touch, helps :active release
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
    </div>
  );
};

// Add React.memo to prevent unnecessary re-renders
export default React.memo(LayoutPreviewSVG);
