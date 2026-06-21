/**
 * SeatMiniSVG.tsx
 *
 * A compact (36×36) seat SVG that renders all condition icons exactly like
 * LayoutSeat does, but at a smaller scale.
 *
 * Used by:
 *   - LayoutLegend   (legend chips)
 *   - SeatMarkingToolbar  (marking palette chips)
 *
 * Does NOT replace LayoutSeat — that component renders full-size seats
 * inside the layout SVG and is unchanged.
 *
 * CONDITION_COLORS is imported from LayoutSeat (single source of truth).
 */
import React from 'react';
import { SpecialCondition } from '@ticketuno/shared/types/seat';
import { CONDITION_COLORS } from './LayoutSeat';

// Compact seat dimensions
const W = 36, H = 36;
const BASE_H = 18, BASE_W = 26, BACK_H = 9;
const ARM_W = 3, ARM_H = 18;

// Icon badge transform — same coordinates as LayoutSeat's icons, scaled to fit
// LayoutSeat uses translate(-11,-9) scale(0.56) for a 40-wide cushion.
// Our cushion is 26-wide → scale factor: (26/40) * 0.56 ≈ 0.36
const ICON_TRANSFORM = 'translate(-7, -6) scale(0.36)';

interface SeatMiniSVGProps {
  condition: SpecialCondition | 'Normal';
  /** Override body color — used in booking-view legend to show condition on a booked seat */
  baseOverride?: string;
  backrestOverride?: string;
  textOverride?: string;
  /** Unique suffix for SVG pattern/clipPath IDs — must be unique per page instance */
  seatKey?: string;
}

const SeatMiniSVG: React.FC<SeatMiniSVGProps> = ({
  condition,
  baseOverride,
  backrestOverride,
  textOverride,
  seatKey = 'x',
}) => {
  const isNormal = condition === 'Normal';
  const col = isNormal ? null : CONDITION_COLORS[condition as SpecialCondition];

  const base     = baseOverride     ?? col?.base     ?? '#730008';
  const backrest = backrestOverride ?? col?.backrest  ?? '#8E0A14';
  const armrest  = col?.armrest     ?? base;
  const text     = textOverride     ?? col?.text      ?? '#f0f0f0';

  const stripeId = `stripe-mini-${seatKey}`;
  const clipId   = `clip-mini-${seatKey}`;

  const hasTopLeftIcon = condition === 'Impaired'
    || condition === 'RestrictedView'
    || condition === 'Staff'
    || condition === 'Baby';

  return (
    <svg width={W} height={H} viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`}>

      {/* Stripe defs for Unavailable — must be direct child of <svg> */}
      {condition === 'Unavailable' && (
        <defs>
          <pattern id={stripeId} patternUnits="userSpaceOnUse" width="6" height="6"
            patternTransform="rotate(45 0 0)">
            <rect width="3" height="6" fill="#FFD600" />
            <rect x="3" width="3" height="6" fill="#111111" />
          </pattern>
          <clipPath id={clipId}>
            <rect x={-BASE_W / 2 + 1} y={BASE_H / 2 - 5} width={BASE_W - 2} height={BACK_H} rx={3} />
          </clipPath>
        </defs>
      )}

      <g transform="translate(0, -3)">

        {/* Cushion */}
        <rect x={-BASE_W / 2} y={-BASE_H / 2} width={BASE_W} height={BASE_H}
          rx={4} fill={base} stroke={armrest} strokeWidth="1" />

        {/* Backrest */}
        <rect x={-BASE_W / 2 + 1} y={BASE_H / 2 - 5} width={BASE_W - 2} height={BACK_H}
          rx={3} fill={backrest} stroke={armrest} strokeWidth="1" />

        {/* Unavailable: hazard tape overlaid on backrest */}
        {condition === 'Unavailable' && (
          <rect x={-BASE_W / 2 + 1} y={BASE_H / 2 - 5} width={BASE_W - 2} height={BACK_H}
            rx={3} fill={`url(#${stripeId})`} clipPath={`url(#${clipId})`} opacity={0.88} />
        )}

        {/* Left armrest */}
        <rect x={-W / 2} y={-ARM_H / 2} width={ARM_W} height={ARM_H} rx={1} fill={armrest} />
        {/* Right armrest */}
        <rect x={W / 2 - ARM_W} y={-ARM_H / 2} width={ARM_W} height={ARM_H} rx={1} fill={armrest} />

        {/* ── Impaired: wheelchair on blue badge ── */}
        {condition === 'Impaired' && (
          <g transform={ICON_TRANSFORM}>
            <rect x={-11} y={-14} width={22} height={23} rx={4} fill="#1155AA" opacity={0.92} />
            <g opacity={0.95}>
              <circle cx="2" cy="-9" r="2.5" fill="white" />
              <line x1="2" y1="-6.5" x2="2" y2="-1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="2" y1="-4" x2="7" y2="-2.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="-4" y1="-1" x2="3" y2="-1" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="3" y1="-1" x2="6" y2="3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="-4" y1="-1" x2="-4" y2="3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <line x1="-4" y1="3" x2="6" y2="3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="-3" cy="1" r="6" fill="none" stroke="white" strokeWidth="2" />
              <circle cx="-3" cy="1" r="1.5" fill="white" />
              <circle cx="6.5" cy="4" r="2" fill="white" />
              <line x1="2" y1="-6.5" x2="-1" y2="-9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </g>
          </g>
        )}

        {/* ── RestrictedView: slashed eye on dark badge ── */}
        {condition === 'RestrictedView' && (
          <g transform={ICON_TRANSFORM}>
            <rect x={-11} y={-14} width={22} height={23} rx={4} fill="#5D1500" opacity={0.92} />
            <path d="M -8 -4 C -4 -11 6 -11 9 -4 C 6 3 -4 3 -8 -4 Z" fill="white" />
            <circle cx="1" cy="-4" r="3.2" fill="#6D3B00" />
            <circle cx="1" cy="-4" r="1.8" fill="#111" />
            <circle cx="2.2" cy="-5" r="0.7" fill="white" opacity="0.8" />
            <line x1="-9" y1="-12" x2="9" y2="6" stroke="#1a0000" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="-9" y1="-12" x2="9" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* ── Staff: yellow badge with person silhouette + STAFF text ── */}
        {condition === 'Staff' && (
          <g transform={ICON_TRANSFORM}>
            <rect x={-11} y={-14} width={22} height={23} rx={4} fill="#FFD600" opacity={0.97} />
            <circle cx="1" cy="-9" r="3" fill="#424242" />
            <path d="M -6 0 C -6 -6 8 -6 8 0 Z" fill="#424242" />
            <line x1="-9" y1="2" x2="9" y2="2" stroke="#C8A000" strokeWidth="0.8" />
            <text x="1" y="8" fontSize="6.5" fontWeight="900" textAnchor="middle" fill="#212121"
              style={{ fontFamily: 'Arial, sans-serif', userSelect: 'none' }}>STAFF</text>
          </g>
        )}

        {/* ── Baby: baby girl face with bow on pink badge ── */}
        {condition === 'Baby' && (
          <g transform={ICON_TRANSFORM}>
            <rect x={-11} y={-14} width={22} height={23} rx={4} fill="#EC407A" opacity={0.88} />
            <circle cx="1" cy="-2" r="7.5" fill="#FFE0B2" />
            <ellipse cx="-4" cy="-11" rx="3.8" ry="2.2" fill="#F48FB1" transform="rotate(-25 -4 -11)" />
            <ellipse cx="6" cy="-11" rx="3.8" ry="2.2" fill="#F48FB1" transform="rotate(25 6 -11)" />
            <circle cx="1" cy="-11" r="1.8" fill="#AD1457" />
            <path d="M -3.5 -3.5 Q -2 -5.5 -0.5 -3.5" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M 2.5 -3.5 Q 4 -5.5 5.5 -3.5" stroke="#5D4037" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M -2 -0.5 Q 1 1.5 4 -0.5" stroke="#E91E63" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="-3.5" cy="-1" r="2" fill="#FF80AB" opacity="0.45" />
            <circle cx="5.5" cy="-1" r="2" fill="#FF80AB" opacity="0.45" />
          </g>
        )}

        {/* Seat label: letter initial for conditions without a badge, "N" for Normal */}
        {!hasTopLeftIcon && (
          <text x={0} y={4} fontSize="10" fontWeight="bold" textAnchor="middle" fill={text}
            style={{ userSelect: 'none', pointerEvents: 'none' }}>
            {isNormal ? 'N' : condition.charAt(0)}
          </text>
        )}

        {/* Seat number shown over the badge icon */}
        {hasTopLeftIcon && (
          <text x={0} y={4} fontSize="9" fontWeight="bold" textAnchor="middle" fill={text}
            style={{
              userSelect: 'none', pointerEvents: 'none',
              filter: 'drop-shadow(0 0px 2px rgba(0,0,0,0.90))',
            }}>
            1
          </text>
        )}

      </g>
    </svg>
  );
};

export default SeatMiniSVG;
