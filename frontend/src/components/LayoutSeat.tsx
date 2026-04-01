import React from 'react';
import type { SeatStatus, SpecialCondition } from '@/shared/types/seat';

/**
 * Color palette for each special condition.
 * Used both on the seat and in the legend.
 */
export const CONDITION_COLORS: Record<
  SpecialCondition,
  { base: string; backrest: string; armrest: string; text: string; label: string }
> = {
  // Absent: {
  //   base:     '#1a1a1a',
  //   backrest: '#111111',
  //   armrest:  '#FF6D00',
  //   text:     '#FF6D00',
  //   label:    'Absent',
  // },
  Unavailable: {
    base:     '#7F0000',
    backrest: '#B71C1C',
    armrest:  '#4E0000',
    text:     '#FFCDD2',
    label:    'Unavailable',
  },
  RestrictedView: {
    base:     '#BF360C',
    backrest: '#E64A19',
    armrest:  '#bf0606',
    text:     '#FBE9E7',
    label:    'Restricted view',
  },
  Premium: {
    base:     '#F57F17',
    backrest: '#FF8F00',
    armrest:  '#ffd012',
    text:     '#1A1A1A',
    label:    'Premium',
  },
  Impaired: {
    base:     '#004D6E',
    backrest: '#006064',
    armrest:  '#002F3E',
    text:     '#B2EBF2',
    label:    'Impaired',
  },
  Staff: {
    base:     '#9E9E9E',
    backrest: '#BDBDBD',
    armrest:  '#757575',
    text:     '#424242',
    label:    'Staff',
  },
  Baby: {
    base:     '#c310bd',
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
  seatId,
  seatNumber,
  status,
  onClick,
  width = 48,
  height = 48,
  interactive = false,
  specialCondition,
  bookingView = false,
}) => {

  // // Absent: completely hidden in booking/non-editing view
  // if (bookingView && specialCondition === 'Absent') {
  //   return null;
  // }

  const seatBaseHeight = 32;
  const seatBaseWidth  = 40;
  const backrestHeight = 16;
  const armrestWidth   = 4;
  const armrestHeight  = 28;

  // Sanitize seatId for use in SVG defs IDs (no colons, pipes, spaces)
  const safeId = seatId.replace(/[^a-zA-Z0-9]/g, '-');

  // Body colors
  const getBodyColors = () => {
    if (!interactive) {
      if (specialCondition && CONDITION_COLORS[specialCondition]) {
        return CONDITION_COLORS[specialCondition];
      }
      return { base: '#730008', backrest: '#8E0A14', text: '#f0f0f0' };
    }
    switch (status) {
      case 'available': return { base: '#1B5E20', backrest: '#2E7D32', text: '#FFFFFF' };
      case 'selected':  return { base: '#1565C0', backrest: '#1976D2', text: '#FFFFFF' };
      case 'booked':    return { base: '#616161', backrest: '#757575', text: '#E0E0E0' };
      case 'reserved':  return { base: '#F57C00', backrest: '#FB8C00', text: '#FFFFFF' };
    }
  };

  const getArmrestColor = () => {
    if (specialCondition && CONDITION_COLORS[specialCondition]) {
      return CONDITION_COLORS[specialCondition].armrest;
    }
    return bodyColors.base;
  };

  const bodyColors   = getBodyColors();
  const armrestColor = getArmrestColor();

  const isClickable = interactive
    //&& !(bookingView && specialCondition === 'Absent')
    && !(bookingView && specialCondition === 'Staff')
    && (!status || status === 'available' || status === 'selected')
  ;

  // Conditions that render a top-left badge icon
  const hasTopLeftIcon = specialCondition === 'Impaired'
    || specialCondition === 'RestrictedView'
    || specialCondition === 'Staff'
    || specialCondition === 'Baby';

  // All badge icons share this transform: top-left quadrant, scaled down
  const iconTransform = 'translate(-11, -9) scale(0.56)';

  // Shared rounded background rect for badge icons (22 wide × 23 tall pre-scale)
  const IconBg = ({ fill, opacity = 0.92 }: { fill: string; opacity?: number }) => (
    <rect x={-11} y={-14} width={22} height={23} rx={4} ry={4} fill={fill} opacity={opacity} />
  );

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={isClickable ? onClick : undefined}
      className={isClickable ? 'seat-interactive' : ''}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        // Absent: 30% opacity in any edit/marking mode (null return handles booking view)
        //opacity: specialCondition === 'Absent' ? 0.30 : 1,
        opacity: 1,
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

      {/* SVG defs for Unavailable stripe pattern — unique per seat to avoid ID clashes */}
      {specialCondition === 'Unavailable' && (
        <defs>
          <pattern
            id={`stripe-${safeId}`}
            patternUnits="userSpaceOnUse"
            width="8" height="8"
            patternTransform="rotate(45 0 0)"
          >
            <rect width="4" height="8" fill="#FFD600" />
            <rect x="4" width="4" height="8" fill="#111111" />
          </pattern>
          <clipPath id={`clip-${safeId}`}>
            {/* Matches the backrest rect exactly so stripes don't overflow its rounded corners */}
            <rect
              x={-seatBaseWidth / 2 + 2}
              y={seatBaseHeight / 2 - 8}
              width={seatBaseWidth - 4}
              height={backrestHeight}
              rx={4}
            />
          </clipPath>
        </defs>
      )}

      {/* ── Seat body (shifted up 4 px to fix geometry bias) ── */}
      <g className="seat-visual" transform="translate(0, -4)">

        {/* Cushion */}
        <rect
          x={-seatBaseWidth / 2}
          y={-seatBaseHeight / 2}
          width={seatBaseWidth}
          height={seatBaseHeight}
          rx={6} ry={6}
          fill={bodyColors.base} stroke={armrestColor} strokeWidth="1.5"
        />

        {/* Backrest */}
        <rect
          x={-seatBaseWidth / 2 + 2}
          y={seatBaseHeight / 2 - 8}
          width={seatBaseWidth - 4}
          height={backrestHeight}
          rx={4} ry={4}
          fill={bodyColors.backrest} stroke={armrestColor} strokeWidth="1.5"
        />

        {/* ── Unavailable: yellow/black 45° hazard tape overlaid on the backrest ── */}
        {specialCondition === 'Unavailable' && (
          <rect
            x={-seatBaseWidth / 2 + 2}
            y={seatBaseHeight / 2 - 8}
            width={seatBaseWidth - 4}
            height={backrestHeight}
            rx={4}
            fill={`url(#stripe-${safeId})`}
            clipPath={`url(#clip-${safeId})`}
            opacity={0.88}
            style={{ pointerEvents: 'none' }}
          />
        )}

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
          fill={armrestColor} stroke={armrestColor} strokeWidth="1"
        />

        {/* ══ BADGE ICONS — all positioned top-left of cushion ══ */}

        {/* ── Impaired: wheelchair symbol on blue background ── */}
        {specialCondition === 'Impaired' && (
          <g transform={iconTransform} style={{ pointerEvents: 'none' }}>
            <IconBg fill="#1155AA" />
            <g opacity={0.95}>
              {/* Head */}
              <circle cx="2" cy="-9" r="2.5" fill="white" />
              {/* Torso */}
              <line x1="2" y1="-6.5" x2="2" y2="-1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              {/* Arm forward */}
              <line x1="2" y1="-4" x2="7" y2="-2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Seat bar */}
              <line x1="-4" y1="-1" x2="3" y2="-1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              {/* Shin angled */}
              <line x1="3" y1="-1" x2="6" y2="3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Back leg */}
              <line x1="-4" y1="-1" x2="-4" y2="3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Footrest */}
              <line x1="-4" y1="3" x2="6" y2="3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              {/* Rear wheel */}
              <circle cx="-3" cy="1" r="6" fill="none" stroke="white" strokeWidth="2" />
              {/* Wheel hub */}
              <circle cx="-3" cy="1" r="1.5" fill="white" />
              {/* Front caster */}
              <circle cx="6.5" cy="4" r="2" fill="white" />
              {/* Push handle */}
              <line x1="2" y1="-6.5" x2="-1" y2="-9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* ── RestrictedView: eye with diagonal slash on dark background ── */}
        {specialCondition === 'RestrictedView' && (
          <g transform={iconTransform} style={{ pointerEvents: 'none' }}>
            <IconBg fill="#5D1500" />
            {/* Eye white — almond/lens shape */}
            <path d="M -8 -4 C -4 -11 6 -11 9 -4 C 6 3 -4 3 -8 -4 Z" fill="white" />
            {/* Iris */}
            <circle cx="1" cy="-4" r="3.2" fill="#6D3B00" />
            {/* Pupil */}
            <circle cx="1" cy="-4" r="1.8" fill="#111" />
            {/* Pupil highlight */}
            <circle cx="2.2" cy="-5" r="0.7" fill="white" opacity="0.8" />
            {/* Diagonal slash: dark shadow + white core */}
            <line x1="-9" y1="-12" x2="9" y2="6" stroke="#1a0000" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="-9" y1="-12" x2="9" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* ── Staff: yellow badge with person silhouette and "STAFF" label ── */}
        {specialCondition === 'Staff' && (
          <g transform={iconTransform} style={{ pointerEvents: 'none' }}>
            <IconBg fill="#FFD600" opacity={0.97} />
            {/* Person head */}
            <circle cx="1" cy="-9" r="3" fill="#424242" />
            {/* Person shoulders */}
            <path d="M -6 0 C -6 -6 8 -6 8 0 Z" fill="#424242" />
            {/* Separator line */}
            <line x1="-9" y1="2" x2="9" y2="2" stroke="#C8A000" strokeWidth="0.8" />
            {/* STAFF label */}
            <text
              x="1" y="8"
              fontSize="6.5" fontWeight="900"
              textAnchor="middle"
              fill="#212121"
              style={{ fontFamily: 'Arial, sans-serif', userSelect: 'none' }}
            >
              STAFF
            </text>
          </g>
        )}

        {/* ── Baby: baby girl face with bow on pink background ── */}
        {specialCondition === 'Baby' && (
          <g transform={iconTransform} style={{ pointerEvents: 'none' }}>
            <IconBg fill="#EC407A" opacity={0.88} />
            {/* Head (peach skin tone) */}
            <circle cx="1" cy="-2" r="7.5" fill="#FFE0B2" />
            {/* Bow — left wing */}
            <ellipse cx="-4" cy="-11" rx="3.8" ry="2.2" fill="#F48FB1" transform="rotate(-25 -4 -11)" />
            {/* Bow — right wing */}
            <ellipse cx="6" cy="-11" rx="3.8" ry="2.2" fill="#F48FB1" transform="rotate(25 6 -11)" />
            {/* Bow — center knot */}
            <circle cx="1" cy="-11" r="1.8" fill="#AD1457" />
            {/* Eyes — cute closed curves */}
            <path d="M -3.5 -3.5 Q -2 -5.5 -0.5 -3.5" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 2.5 -3.5 Q 4 -5.5 5.5 -3.5" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Smile */}
            <path d="M -2 -0.5 Q 1 1.5 4 -0.5" stroke="#E91E63" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            {/* Cheeks */}
            <circle cx="-3.5" cy="-1" r="2" fill="#FF80AB" opacity="0.45" />
            <circle cx="5.5" cy="-1" r="2" fill="#FF80AB" opacity="0.45" />
          </g>
        )}

        {/* Seat number — centered; drop-shadow when a badge icon is present */}
        <text
          x={0} y={5}
          fontSize={14} fontWeight="bold"
          textAnchor="middle"
          fill={bodyColors.text}
          style={{
            userSelect: 'none',
            pointerEvents: 'none',
            filter: hasTopLeftIcon
              ? 'drop-shadow(0 0px 2.5px rgba(0,0,0,0.90))'
              : undefined,
          }}
        >
          {seatNumber}
        </text>

      </g>{/* end seat-visual */}

      <style>{`
        .seat-interactive .seat-visual {
          transition: transform 0.15s ease, filter 0.15s ease;
          transform-origin: center;
          transform-box: fill-box;
        }

        /* Desktop — hover only on real pointer devices */
        @media (hover: hover) and (pointer: fine) {
          .seat-interactive:hover .seat-visual {
            transform: scale(1.12);
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));
          }
          .seat-interactive:hover .seat-hover-bg {
            fill: rgba(255,255,255,0.18);
          }
        }

        /* Mobile — :active releases the moment the finger lifts */
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
