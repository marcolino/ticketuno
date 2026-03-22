import React from 'react';
import type { SeatStatus, SpecialCondition } from '@/shared/types/layoutToSeats';

/**
 * Color palette for each special condition.
 * Used both on the seat and in the legend.
 */
export const CONDITION_COLORS: Record<
  SpecialCondition,
  { base: string; backrest: string; armrest: string; text: string; label: string }
> = {
  Absent: {
    base:     '#1a1a1a', // near-black body — slot feels "empty"
    backrest: '#111111',
    armrest:  '#FF6D00', // bright warning orange armrest — "this seat is marked"
    text:     '#FF6D00', // number in same orange so it's readable
    label:    'Absent',
  },
  Unavailable: {
    base:     '#7F0000', // very deep crimson
    backrest: '#B71C1C',
    armrest:  '#4E0000',
    text:     '#FFCDD2',
    label:    'Unavailable',
  },
  RestrictedView: {
    base:     '#BF360C', // burnt sienna — "caution, but not danger"
    backrest: '#E64A19',
    armrest:  '#bf0606',
    text:     '#FBE9E7',
    label:    'Restricted view',
  },
  Premium: {
    base:     '#F57F17', // rich amber gold
    backrest: '#FF8F00',
    armrest:  '#ffd012',
    text:     '#1A1A1A', // dark text on gold — better contrast
    label:    'Premium',
  },
  Impaired: {
    base:     '#004D6E', // deep teal-blue
    backrest: '#006064',
    armrest:  '#002F3E',
    text:     '#B2EBF2',
    label:    'Impaired',
  },
  Staff: {
    base:     '#9E9E9E', // medium grey
    backrest: '#BDBDBD',
    armrest:  '#757575',
    text:     '#424242',
    label:    'Staff',
  },
  Baby: {
    base:     '#c310bd', // deep raspberry / magenta
    backrest: '#ac0b9e',
    armrest:  '#ee22ea',
    text:     '#FCE4EC',
    label:    'Baby',
  },
};

// ─── LayoutSeat ───────────────────────────────────────────────────────────────

interface LayoutSeatProps {
  x: number;
  y: number;
  seatId: string;
  seatNumber: string;
  status: SeatStatus;
  //resolvedStatus?: SeatStatus;
  onClick?: () => void;
  width?: number;
  height?: number;
  interactive?: boolean;
  specialCondition?: SpecialCondition;
  bookingView?: boolean;
}

const LayoutSeat: React.FC<LayoutSeatProps> = ({
  x,
  y,
  seatNumber,
  status,
  resolvedStatus,
  onClick,
  width = 48,
  height = 48,
  interactive = false,
  specialCondition,
  bookingView = false,
}) => {

  // Hide absent seats completely, but only from the public booking view
  if (bookingView && specialCondition === 'Absent') {
    return null;
  }

  const seatBaseHeight = 32;
  const seatBaseWidth  = 40;
  const backrestHeight = 16;
  const armrestWidth   = 4;
  const armrestHeight  = 28;
  const isAbsentInEdit = !interactive && specialCondition === 'Absent';

  // Body colors: always status-based in booking view, always condition-based in edit view
  const getBodyColors = () => {
    if (!interactive) {
      // Edit view — full condition color everywhere
      if (specialCondition && CONDITION_COLORS[specialCondition]) {
        return CONDITION_COLORS[specialCondition];
      }
      return { base: '#730008', backrest: '#8E0A14', text: '#f0f0f0' };
    }
    // Booking view — status drives the body
    switch (status) {
      case 'available': return { base: '#1B5E20', backrest: '#2E7D32', text: '#FFFFFF' };
      case 'selected':  return { base: '#1565C0', backrest: '#1976D2', text: '#FFFFFF' };
      case 'booked':    return { base: '#616161', backrest: '#757575', text: '#E0E0E0' };
      case 'reserved':  return { base: '#F57C00', backrest: '#FB8C00', text: '#FFFFFF' };
    }
  };

  // Armrest colors: condition-based when a condition exists, otherwise follow body
  const getArmrestColor = () => {
    if (specialCondition && CONDITION_COLORS[specialCondition]) {
      return CONDITION_COLORS[specialCondition].armrest;
    }
    return bodyColors.base; // No condition: match cushion as before
  };

  const bodyColors  = getBodyColors();
  const armrestColor = getArmrestColor();

  const isClickable = interactive
    && !(bookingView && specialCondition === 'Absent')
    && !(bookingView && specialCondition === 'Staff')
    && (!status || status === 'available' || status === 'selected')
  ;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={isClickable ? onClick : undefined}
      className={isClickable ? 'seat-interactive' : ''}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        opacity: isAbsentInEdit ? 0.28 : 1,
      }}
    >
      {/* Hover highlight */}
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

      {/* ── Seat body — shifted up 4 px to fix geometry bias ── */}
      <g className="seat-visual" transform="translate(0, -4)">
        {/* Cushion */}
        <rect
          x={-seatBaseWidth / 2}
          y={-seatBaseHeight / 2}
          width={seatBaseWidth}
          height={seatBaseHeight}
          rx={6}
          ry={6}
          fill={bodyColors.base} stroke={armrestColor} strokeWidth="1.5"
        />
        {/* Backrest */}
        <rect
          x={-seatBaseWidth / 2 + 2}
          y={seatBaseHeight / 2 - 8}
          width={seatBaseWidth - 4}
          height={backrestHeight}
          rx={4}
          ry={4}
          fill={bodyColors.backrest} stroke={armrestColor} strokeWidth="1.5"
        />
        {/* Left armrest */}
        <rect
          x={-width / 2} y={-armrestHeight / 2}
          width={armrestWidth} height={armrestHeight}
          rx={1} ry={1}
          fill={armrestColor} stroke={armrestColor} strokeWidth="1"
        />
        {/* Right armrest */}
        <rect
          x={width / 2 - armrestWidth}
          y={-armrestHeight / 2}
          width={armrestWidth}
          height={armrestHeight}
          rx={1} ry={1}
          fill={armrestColor}
          stroke={armrestColor} strokeWidth="1"
        />

        {/* ── Wheelchair icon — Impaired seats only, top-left, under the number ── */}
        {specialCondition === 'Impaired' && (
          // translate to top-left of cushion, then scale down
          <g transform="translate(-11, -9) scale(0.56)" style={{ pointerEvents: 'none' }}>
            {/* Blue background pill */}
            <rect
              x={-11} y={-14} width={22} height={23}
              rx={4} ry={4}
              fill="#1155AA" opacity={0.90}
            />
            {/* White wheelchair figure */}
            <g opacity={0.95}>
              {/* Head */}
              <circle cx="2" cy="-9" r="2.5" fill="white" />
              {/* Torso */}
              <line x1="2" y1="-6.5" x2="2" y2="-1"
                stroke="white" strokeWidth="2" strokeLinecap="round" />
              {/* Arm extended forward */}
              <line x1="2" y1="-4" x2="7" y2="-2.5"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Seat (horizontal) */}
              <line x1="-4" y1="-1" x2="3" y2="-1"
                stroke="white" strokeWidth="2" strokeLinecap="round" />
              {/* Shin / leg angled forward */}
              <line x1="3" y1="-1" x2="6" y2="3"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Back leg (vertical) */}
              <line x1="-4" y1="-1" x2="-4" y2="3"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Footrest */}
              <line x1="-4" y1="3" x2="6" y2="3"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Large rear wheel */}
              <circle cx="-3" cy="1" r="6"
                fill="none" stroke="white" strokeWidth="2" />
              {/* Wheel hub dot */}
              <circle cx="-3" cy="1" r="1.5" fill="white" />
              {/* Front caster */}
              <circle cx="6.5" cy="4" r="2" fill="white" />
              {/* Push handle */}
              <line x1="2" y1="-6.5" x2="-1" y2="-9.5"
                stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* Seat number */}
        <text
          x={0}
          y={5}
          fontSize={14}
          fontWeight="bold"
          textAnchor="middle"
          fill={bodyColors.text}
          style={{
            userSelect: 'none',
            pointerEvents: 'none',
            filter: specialCondition === 'Impaired'
              ? 'drop-shadow(0 0px 2.5px rgba(0,0,0,0.85))'
              : undefined,
          }}
        >
          {seatNumber}
        </text>

        {/* Absent dashed outline in edit view */}
        {isAbsentInEdit && (
          <>
            <rect
              x={-seatBaseWidth / 2}
              y={-seatBaseHeight / 2}
              width={seatBaseWidth}
              height={seatBaseHeight}
              rx={6}
              fill="none"
              stroke="#FF5722"
              strokeWidth={2} strokeDasharray="5 3"
            />
            <line x1={-8} y1={-8} x2={8} y2={8}
              stroke="#FF5722" strokeWidth={2} strokeLinecap="round" />
            <line x1={8} y1={-8} x2={-8} y2={8}
              stroke="#FF5722" strokeWidth={2} strokeLinecap="round" />
          </>
        )}
      </g>

      <style>{`
        .seat-interactive .seat-visual {
          transition: transform 0.15s ease, filter 0.15s ease;
          transform-origin: center;
          transform-box: fill-box;
        }

        /* Desktop only: pointer devices that can actually hover */
        @media (hover: hover) and (pointer: fine) {
          .seat-interactive:hover .seat-visual {
            transform: scale(1.12);
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
          }
          .seat-interactive:hover .seat-hover-bg {
            fill: rgba(255,255,255,0.18);
          }
        }

        /* Mobile: :active releases the moment the finger lifts */
        .seat-interactive:active .seat-visual {
          transform: scale(1.12);
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
        }
        .seat-interactive:active .seat-hover-bg {
          fill: rgba(255,255,255,0.18);
        }
      `}</style>
    </g>
  );
};

export default LayoutSeat;
