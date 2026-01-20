import React from "react";

interface LayoutSeatProps {
  x: number;
  y: number;
  seatNumber: string;
  width?: number;
  height?: number;
}

const LayoutSeat: React.FC<LayoutSeatProps> = ({
  x,
  y,
  seatNumber,
  width = 48,
  height = 48
}) => {
  // Seat dimensions
  const seatBaseHeight = 32; // Height of the seat base (cushion part)
  const seatBaseWidth = 40; // Width of the seat base
  const backrestHeight = 16; // Height of the backrest
  const armrestWidth = 4; // Width of each armrest
  const armrestHeight = 28; // Height of armrests
  
  // Theater seat colors
  const seatBaseColor = "#711324";     // Dark red for seat base
  const seatBackrestColor = "#8B1E3F"; // Slightly lighter red for backrest
  const armrestColor = "#5A1520";      // Darker red for armrests
  const seatTextColor = "#FFFFFF";     // White text for contrast
  
  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Seat Base (Cushion) - rectangle with beveled corners */}
      <rect
        x={-seatBaseWidth / 2}
        y={-seatBaseHeight / 2}
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
        x={-seatBaseWidth / 2 + 2}
        y={-height / 2}
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
        x={-width / 2}
        y={-armrestHeight / 2}
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
        x={width / 2 - armrestWidth}
        y={-armrestHeight / 2}
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
        x1={-seatBaseWidth / 2 + 8}
        x2={seatBaseWidth / 2 - 8}
        y1={0}
        y2={0}
        stroke="#D4A76A"
        strokeWidth="1"
        strokeDasharray="3,3"
      /> */}
      
      {/* Seat Number */}
      <text
        x={0}
        y={5}
        fontSize="14"
        fontWeight="bold"
        textAnchor="middle"
        fill={seatTextColor}
        style={{ userSelect: 'none' }}
      >
        {seatNumber}
      </text>
    </g>
  );
};

export default LayoutSeat;
