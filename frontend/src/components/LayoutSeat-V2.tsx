import React from 'react';
import type { SeatStatus } from '@/shared/types/layoutToSeats';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SpecialCondition =
  | 'Absent'        // Physically missing seat (column, passageway). Edit: ghost. Booking: hidden.
  | 'Unavailable'   // Broken/out-of-service seat. Booking: caution-tape overlay.
  | 'RestrictedView'// Obstructed sightline. Booking: pirate face.
  | 'Premium'       // VIP / upsell tier. Booking: gold star.
  | 'Impaired'      // Reserved for wheelchair users. Booking: wheelchair symbol.
  | 'Staff'         // Reserved for staff/press/comps. Edit: badge. Booking: hidden.
  | 'Baby';         // Baby-cradle attachment seat. Booking: pacifier.

interface LayoutSeatProps {
  x: number;
  y: number;
  seatId: string;           // Composite ID: "Platea-A-1"
  seatNumber: string;       // Display number: "1"
  status: SeatStatus;
  onClick?: () => void;
  width?: number;
  height?: number;
  interactive?: boolean;    // true = booking view, false = editing view
  specialCondition?: SpecialCondition;
}

// ─── Condition Overlays ───────────────────────────────────────────────────────
// All centered at (0, 0). Seat cushion occupies roughly x∈[-20,20] y∈[-16,16].

/**
 * UNAVAILABLE — Yellow/black caution tape.
 * In booking: full overlay signals "do not sit here".
 */
const UnavailableOverlay: React.FC<{ id: string }> = ({ id }) => (
  <>
    <defs>
      <pattern
        id={`caution-${id}`} x="0" y="0" width="10" height="10"
        patternUnits="userSpaceOnUse" patternTransform="rotate(45)"
      >
        <rect width="5" height="10" fill="#FFD700" />
        <rect x="5" width="5" height="10" fill="#111111" />
      </pattern>
      <clipPath id={`clip-caution-${id}`}>
        <rect x={-19} y={-15} width={38} height={30} rx={5} />
      </clipPath>
    </defs>
    {/* Diagonal caution tape fill */}
    <rect
      x={-19} y={-15} width={38} height={30} rx={5}
      fill={`url(#caution-${id})`} opacity={0.9}
      clipPath={`url(#clip-caution-${id})`}
    />
    {/* Bold red border */}
    <rect x={-19} y={-15} width={38} height={30} rx={5}
      fill="none" stroke="#DD0000" strokeWidth={2.5} />
    {/* Central ✕ */}
    {/* <line x1={-8} y1={-8} x2={8} y2={8} stroke="#DD0000" strokeWidth={2.5} strokeLinecap="round" />
    <line x1={8} y1={-8} x2={-8} y2={8} stroke="#DD0000" strokeWidth={2.5} strokeLinecap="round" /> */}
  </>
);

/**
 * RESTRICTED VIEW — Single eye, black oblique bar across it.
 * No background disc. Clean, serious, universally readable.
 */
const RestrictedViewOverlay = ({ id = 'rv' }) => (
  <g>
    <defs>
      <clipPath id={`eye-clip-${id}`}>
        <path d="M -12 0 Q -6 -8 0 -8 Q 6 -8 12 0 Q 6 8 0 8 Q -6 8 -12 0 Z" />
      </clipPath>
    </defs>

    {/* Eye white */}
    <path
      d="M -12 0 Q -6 -8 0 -8 Q 6 -8 12 0 Q 6 8 0 8 Q -6 8 -12 0 Z"
      fill="white"
      stroke="#999"
      strokeWidth={0.6}
    />

    {/* Iris */}
    <circle cx={0} cy={0} r={4} fill="#2a6496" />
    {/* Pupil */}
    <circle cx={0} cy={0} r={2} fill="#0a0a0a" />
    {/* Highlight */}
    <circle cx={1.2} cy={-1.4} r={0.9} fill="rgba(255,255,255,0.75)" />

    {/* Eyelid crease */}
    <path
      d="M -12 0 Q -6 -8 0 -8 Q 6 -8 12 0"
      fill="none" stroke="#bbb" strokeWidth={0.7}
    />

    {/* Black oblique bar — clipped to eye shape so it feels ON the eye */}
    <rect
      x={-14} y={-4}
      width={28} height={3}
      transform="rotate(-28)"
      fill="#111"
      clipPath={`url(#eye-clip-${id})`}
    />
    {/* Thin bright edge on bar for 3-D depth */}
    <rect
      x={-14} y={-4}
      width={28} height={1.2}
      transform="rotate(-28)"
      fill="rgba(255,255,255,0.18)"
      clipPath={`url(#eye-clip-${id})`}
    />
  </g>
);

/**
 * PREMIUM — Glowing gold five-pointed star.
 */
const PremiumOverlay: React.FC<{ id: string }> = ({ id }) => (
  <>
    <defs>
      <filter id={`glow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="2.5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <linearGradient id={`stargrad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF176" />
        <stop offset="50%" stopColor="#FFD700" />
        <stop offset="100%" stopColor="#F9A825" />
      </linearGradient>
    </defs>
    <g filter={`url(#glow-${id})`}>
      <polygon
        points="0,-14 3.5,-5 13,-5 5.5,1.5 8.5,11.5 0,6 -8.5,11.5 -5.5,1.5 -13,-5 -3.5,-5"
        fill={`url(#stargrad-${id})`}
        stroke="#B8860B"
        strokeWidth={1}
      />
    </g>
  </>
);

/**
 * IMPAIRED — White ISA wheelchair symbol on a blue disc.
 * Universally recognised, high contrast.
 */
const ImpairedOverlay: React.FC = () => (
  <g>
    {/* Blue background disc */}
    <circle cx={0} cy={0} r={13.5} fill="#1565C0" />
    {/* Wheelchair symbol, white, centered */}
    <g transform="translate(-7, -11)" fill="white" stroke="none">
      {/* Head */}
      <circle cx={8} cy={3} r={2.8} />
      {/* Torso */}
      <line x1={8} y1={5.8} x2={5.5} y2={13.5}
        stroke="white" strokeWidth={2.5} strokeLinecap="round" />
      {/* Forward arm to seat back */}
      <line x1={8} y1={9} x2={14.5} y2={9}
        stroke="white" strokeWidth={2} strokeLinecap="round" />
      {/* Seat pan */}
      <line x1={5.5} y1={13.5} x2={14.5} y2={13.5}
        stroke="white" strokeWidth={2} strokeLinecap="round" />
      {/* Lower leg / footrest */}
      <line x1={14.5} y1={13.5} x2={12.5} y2={18.5}
        stroke="white" strokeWidth={2} strokeLinecap="round" />
      {/* Large wheel */}
      <circle cx={7} cy={19.5} r={5}
        fill="none" stroke="white" strokeWidth={2} />
      {/* Small front caster */}
      <circle cx={14.5} cy={19} r={1.8} />
    </g>
  </g>
);

/**
 * STAFF — Blue official badge shield with a gold star.
 * Signals "reserved / official use".
 */
const StaffOverlay: React.FC = () => (
  <g>
    {/* Shield body */}
    <path
      d="M 0 -14  L 11.5 -8  L 11.5 3.5  Q 0 14 -11.5 3.5  L -11.5 -8 Z"
      fill="#1565C0"
      stroke="#0D47A1"
      strokeWidth={1.2}
    />
    {/* Inner shield bevel */}
    <path
      d="M 0 -11  L 8.5 -6.5  L 8.5 3  Q 0 10.5 -8.5 3  L -8.5 -6.5 Z"
      fill="none"
      stroke="rgba(255,255,255,0.25)"
      strokeWidth={1}
    />
    {/* Gold star */}
    <polygon
      points="0,-7.5 1.8,-2.5 7,-2.5 2.9,0.7 4.4,5.8 0,2.9 -4.4,5.8 -2.9,0.7 -7,-2.5 -1.8,-2.5"
      fill="#FFD700"
      stroke="#B8860B"
      strokeWidth={0.7}
    />
  </g>
);

/**
 * BABY — Pram / stroller silhouette on a soft teal disc.
 * Universally recognised as "baby / infant". Clean at any size.
 */
const BabyOverlay = () => (
  <g>
    {/* Soft teal disc */}
    <circle cx={0} cy={0} r={13.5} fill="#00838F" />

    {/*
      Pram built from simple shapes, all white.
      Origin 0,0 = disc centre. Everything scaled to fit r=11.
      Hood top ≈ y -10, wheel bottoms ≈ y +10.
    */}
    <g fill="white" stroke="none">

      {/* Hood / canopy — a semicircle arc */}
      <path d="M -8.5 1 A 8.5 9 0 0 1 8.5 1 Z" />

      {/* Pram body — rounded rectangle */}
      <rect x={-8.5} y={1} width={17} height={7} rx={2} />

      {/* Hood peak / visor line */}
      <rect x={-8.5} y={0.2} width={17} height={1.2} rx={0.6}
        fill="rgba(0,0,0,0.15)" />

      {/* Handle — bar extending to the right */}
      <rect x={6} y={-8} width={1.8} height={9} rx={0.9}
        fill="white" />
      {/* Handle grip */}
      <rect x={3} y={-8.8} width={5} height={1.8} rx={0.9}
        fill="white" />

      {/* Left wheel */}
      <circle cx={-5} cy={9.5} r={2.8}
        fill="none" stroke="white" strokeWidth={1.8} />
      {/* Left wheel hub */}
      <circle cx={-5} cy={9.5} r={0.8} fill="white" />

      {/* Right wheel */}
      <circle cx={5} cy={9.5} r={2.8}
        fill="none" stroke="white" strokeWidth={1.8} />
      {/* Right wheel hub */}
      <circle cx={5} cy={9.5} r={0.8} fill="white" />

      {/* Axle */}
      <line x1={-5} y1={9.5} x2={5} y2={9.5}
        stroke="white" strokeWidth={1} />

    </g>
  </g>
);


// ─── Absent ghost indicator (editing view only) ───────────────────────────────

const AbsentGhostOverlay: React.FC<{ seatBaseWidth: number; seatBaseHeight: number }> = ({
  seatBaseWidth,
  seatBaseHeight,
}) => (
  <>
    {/* Dashed "missing seat" outline */}
    <rect
      x={-seatBaseWidth / 2} y={-seatBaseHeight / 2}
      width={seatBaseWidth} height={seatBaseHeight}
      rx={6}
      fill="none"
      stroke="#FF5722"
      strokeWidth={2}
      strokeDasharray="5 3"
    />
    {/* ∅ symbol */}
    <circle cx={0} cy={0} r={9} fill="none" stroke="#FF5722" strokeWidth={2} opacity={0.7} />
    <line x1={-6} y1={-6} x2={6} y2={6} stroke="#FF5722" strokeWidth={2} opacity={0.7} strokeLinecap="round" />
  </>
);

// ─── Main component ───────────────────────────────────────────────────────────

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
}) => {
interactive = false;
//specialCondition = 'Absent';
//specialCondition = 'Unavailable';
//specialCondition = 'RestrictedView';
//specialCondition = 'Premium';
//specialCondition = 'Impaired';
//specialCondition = 'Staff';
//specialCondition = 'Baby';

  // // Booking view: Absent and Staff seats are completely invisible to users
  if (interactive && (specialCondition === 'Absent' || specialCondition === 'Staff')) {
    return null;
  }

  const seatBaseHeight = 32;
  const seatBaseWidth = 40;
  const backrestHeight = 16;
  const armrestWidth = 4;
  const armrestHeight = 28;

  const isAbsentInEdit = !interactive && specialCondition === 'Absent';
  const hasConditionOverlay = !!specialCondition && specialCondition !== 'Absent';

  const getColors = () => {
    // Ghost style for absent seats in edit view
    if (isAbsentInEdit) {
      return { base: '#2a2a2a', backrest: '#333', armrest: '#1a1a1a', text: '#666' };
    }
    if (!interactive) {
      return { base: '#730008', backrest: '#8E0A14', armrest: '#3B1F1F', text: '#f0f0f0' };
    }
    switch (status) {
      case 'available': return { base: '#1B5E20', backrest: '#2E7D32', armrest: '#145218', text: '#FFFFFF' };
      case 'selected':  return { base: '#1565C0', backrest: '#1976D2', armrest: '#0D47A1', text: '#FFFFFF' };
      case 'booked':    return { base: '#616161', backrest: '#757575', armrest: '#424242', text: '#E0E0E0' };
      case 'reserved':  return { base: '#F57C00', backrest: '#FB8C00', armrest: '#E65100', text: '#FFFFFF' };
    }
  };

  const colors = getColors();
  const isClickable = interactive && (status === 'available' || status === 'selected');

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={isClickable ? onClick : undefined}
      className={isClickable ? 'seat-interactive' : ''}
      style={{
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'transform 0.2s',
        // Ghost-fade absent seats in editing view
        opacity: isAbsentInEdit ? 0.28 : 1,
      }}
    >
      {/* ── Hover highlight (booking view, clickable seats) ───── */}
      {isClickable && (
        <rect
          x={-width / 2 - 4} y={-height / 2 - 4}
          width={width + 8} height={height + 8}
          rx={8}
          fill="transparent"
          className="seat-hover-bg"
        />
      )}

      {/* ── Seat body ──────────────────────────────────────────── */}
      <g className="seat-visual">
        {/* Cushion */}
        <rect
          x={-seatBaseWidth / 2} y={-seatBaseHeight / 2}
          width={seatBaseWidth} height={seatBaseHeight}
          rx={6} ry={6}
          fill={colors.base} stroke={colors.armrest} strokeWidth="1.5"
        />
        {/* Backrest */}
        <rect
          x={-seatBaseWidth / 2 + 2} y={seatBaseHeight / 2 - 8}
          width={seatBaseWidth - 4} height={backrestHeight}
          rx={4} ry={4}
          fill={colors.backrest} stroke={colors.armrest} strokeWidth="1.5"
        />
        {/* Left armrest */}
        <rect
          x={-width / 2} y={-armrestHeight / 2}
          width={armrestWidth} height={armrestHeight}
          rx={1} ry={1}
          fill={colors.armrest} stroke={colors.armrest} strokeWidth="1"
        />
        {/* Right armrest */}
        <rect
          x={width / 2 - armrestWidth} y={-armrestHeight / 2}
          width={armrestWidth} height={armrestHeight}
          rx={1} ry={1}
          fill={colors.armrest} stroke={colors.armrest} strokeWidth="1"
        />
        {/* Seat number — shown centered when no overlay, as small bottom label when overlay present */}
        <text
          x={0}
          y={hasConditionOverlay ? 14 : 5}
          fontSize={hasConditionOverlay ? 9 : 14}
          fontWeight="bold"
          textAnchor="middle"
          fill={hasConditionOverlay ? 'rgba(255,255,255,0.6)' : colors.text}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {seatNumber}
        </text>
      </g>

      {/* ── Condition overlay ──────────────────────────────────── */}
      {hasConditionOverlay && (
        <g className="seat-condition">
          {specialCondition === 'Unavailable'    && <UnavailableOverlay id={seatId} />}
          {specialCondition === 'RestrictedView' && <RestrictedViewOverlay />}
          {specialCondition === 'Premium'        && <PremiumOverlay id={seatId} />}
          {specialCondition === 'Impaired'       && <ImpairedOverlay />}
          {specialCondition === 'Staff'          && <StaffOverlay />}
          {specialCondition === 'Baby'           && <BabyOverlay />}
        </g>
      )}

      {/* ── Absent dashed outline (edit view only) ─────────────── */}
      {isAbsentInEdit && (
        <AbsentGhostOverlay
          seatBaseWidth={seatBaseWidth}
          seatBaseHeight={seatBaseHeight}
        />
      )}

      {/* ── CSS: hover / scale effects ─────────────────────────── */}
      <style>{`
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
        .seat-interactive:hover .seat-condition {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        }
      `}</style>
    </g>
  );
};

export default LayoutSeat;
