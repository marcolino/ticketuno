import React from 'react';
import type { SeatStatus } from '@/shared/types/layoutToSeats';

//export type SeatStatus = 'available' | 'selected' | 'booked' | 'reserved';

interface LayoutSeatProps {
  x: number;
  y: number;
  seatId: string;           // Composite ID: "Platea-A-1"
  seatNumber: string;       // Display number: "1"
  status: SeatStatus;
  onClick?: () => void;
  width?: number;
  height?: number;
  interactive?: boolean;    // Enable hover/click effects
}

const LayoutSeat: React.FC<LayoutSeatProps> = ({
  x,
  y,
  //seatId,
  seatNumber,
  status,
  onClick,
  width = 48,
  height = 48,
  interactive = false
}) => {
  // Seat dimensions
  const seatBaseHeight = 32;
  const seatBaseWidth = 40;
  const backrestHeight = 16;
  const armrestWidth = 4;
  const armrestHeight = 28;
  
  // Color scheme by status
  const getColors = () => {
    switch (status) {
      case 'available':
        return {
          base: "#1B5E20",      // Dark green
          backrest: "#2E7D32",  // Green
          armrest: "#145218",   // Darker green
          text: "#FFFFFF"
        };
      case 'selected':
        return {
          base: "#1565C0",      // Dark blue
          backrest: "#1976D2",  // Blue
          armrest: "#0D47A1",   // Darker blue
          text: "#FFFFFF"
        };
      case 'booked':
        return {
          base: "#616161",      // Gray
          backrest: "#757575",  // Light gray
          armrest: "#424242",   // Dark gray
          text: "#E0E0E0"
        };
      case 'reserved':
        return {
          base: "#F57C00",      // Orange
          backrest: "#FB8C00",  // Light orange
          armrest: "#E65100",   // Dark orange
          text: "#FFFFFF"
        };
    }
  };
  
  const colors = getColors();
  const isClickable = interactive && (status === 'available' || status === 'selected');
  
  return (
    <g
      //pointerEvents="bounding-box"
      transform={`translate(${x}, ${y})`}
      onClick={isClickable ? onClick : undefined}
      className={isClickable ? 'seat-interactive' : ''}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s'
      }}
    >
      <style>
       
      </style>
      {/* Hover effect background (only for interactive seats) */}
      {isClickable && (
        <rect
          x={-width / 2 - 4}
          y={-height / 2 - 4}
          width={width + 8}
          height={height + 8}
          rx={8}
          fill="transparent"
          className="seat-hover-bg"
        />
      )}
      
      <g className="seat-visual"> {/* 👇 ONLY this scales / glows */}
        {/* Seat Base (Cushion) */}
        <rect
          x={-seatBaseWidth / 2}
          y={-seatBaseHeight / 2}
          width={seatBaseWidth}
          height={seatBaseHeight}
          rx={6}
          ry={6}
          fill={colors.base}
          stroke={colors.armrest}
          strokeWidth="1.5"
        />
        
        {/* Backrest */}
        <rect
          x={-seatBaseWidth / 2 + 2}
          y={-height / 2}
          width={seatBaseWidth - 4}
          height={backrestHeight}
          rx={4}
          ry={4}
          fill={colors.backrest}
          stroke={colors.armrest}
          strokeWidth="1.5"
        />
        
        {/* Left Armrest */}
        <rect
          x={-width / 2}
          y={-armrestHeight / 2}
          width={armrestWidth}
          height={armrestHeight}
          rx={1}
          ry={1}
          fill={colors.armrest}
          stroke={colors.armrest}
          strokeWidth="1"
        />
        
        {/* Right Armrest */}
        <rect
          x={width / 2 - armrestWidth}
          y={-armrestHeight / 2}
          width={armrestWidth}
          height={armrestHeight}
          rx={1}
          ry={1}
          fill={colors.armrest}
          stroke={colors.armrest}
          strokeWidth="1"
        />
        
        {/* Seat Number */}
        <text
          x={0}
          y={5}
          fontSize="14"
          fontWeight="bold"
          textAnchor="middle"
          fill={colors.text}
          style={{ 
            userSelect: 'none',
            pointerEvents: 'none' // Don't block click events
          }}
        >
          {seatNumber}
        </text>
      </g>
      
      {/* CSS for hover effect */}
      <style>
        {`
          .seat-interactive .seat-visual {
            transition: transform 0.15s ease, filter 0.15s ease;
            transform-origin: center;
            transform-box: fill-box;
          }
          .seat-interactive:hover .seat-visual {
            transform: scale(1.12);
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
          }
          .seat-interactive:hover .seat-hover-bg {
            fill: rgba(255,255,255,0.18);
          }
          /*
          .seat-interactive:hover .seat-visual {
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
          }
          .seat-interactive:hover .seat-hover-bg {
            fill: rgba(255,255,255,0.25);
          }
          .seat-interactive:hover .seat-hover-bg {
            fill: rgba(255, 255, 255, 0.2);
          }
          .seat-interactive:hover {
            transform: scale(1.15);
          }
          */
        `}
      </style>
    </g>
  );
};

export default LayoutSeat;
