import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONDITION_COLORS } from './LayoutSeat';
import { SpecialCondition } from '../shared/types/layoutToSeats';

interface LayoutLegendProps {
  conditions: SpecialCondition[];
  showStatusLegend?: boolean;
  isEditView?: boolean;
}

// Seat dimensions — match LayoutSeat exactly
const W = 48, H = 48;
const BASE_H = 32, BASE_W = 40, BACK_H = 16;
const ARM_W = 4, ARM_H = 28;

// Shared badge transform and background — match LayoutSeat exactly
const ICON_TRANSFORM = 'translate(-11, -9) scale(0.56)';

// ── Mini seat — mirrors LayoutSeat structure and icon rendering exactly ────────
const MiniSeat: React.FC<{
  base: string;
  backrest: string;
  armrest: string;
  text: string;
  number?: number;
  condition?: SpecialCondition;
  seatKey?: string;
}> = ({ base, backrest, armrest, text, number = 1, condition, seatKey = 'x' }) => {

  const hasTopLeftIcon = condition === 'Impaired'
    || condition === 'RestrictedView'
    || condition === 'Staff'
    || condition === 'Baby';

  const stripePatternId = `stripe-legend-${seatKey}`;
  const stripeClipId    = `clip-legend-${seatKey}`;

  return (
    <svg width={W} height={H} viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`}>

      {/* Stripe defs for Unavailable — must live inside the same <svg> */}
      {condition === 'Unavailable' && (
        <defs>
          <pattern
            id={stripePatternId}
            patternUnits="userSpaceOnUse"
            width="8" height="8"
            patternTransform="rotate(45 0 0)"
          >
            <rect width="4" height="8" fill="#FFD600" />
            <rect x="4" width="4" height="8" fill="#111111" />
          </pattern>
          <clipPath id={stripeClipId}>
            <rect
              x={-BASE_W / 2 + 2}
              y={BASE_H / 2 - 8}
              width={BASE_W - 4}
              height={BACK_H}
              rx={4}
            />
          </clipPath>
        </defs>
      )}

      <g transform="translate(0, -4)">
        {/* Cushion */}
        <rect x={-BASE_W / 2} y={-BASE_H / 2} width={BASE_W} height={BASE_H}
          rx={6} fill={base} stroke={armrest} strokeWidth="1.5" />

        {/* Backrest */}
        <rect x={-BASE_W / 2 + 2} y={BASE_H / 2 - 8} width={BASE_W - 4} height={BACK_H}
          rx={4} fill={backrest} stroke={armrest} strokeWidth="1.5" />

        {/* ── Unavailable: hazard tape on backrest ── */}
        {condition === 'Unavailable' && (
          <rect
            x={-BASE_W / 2 + 2} y={BASE_H / 2 - 8}
            width={BASE_W - 4} height={BACK_H}
            rx={4}
            fill={`url(#${stripePatternId})`}
            clipPath={`url(#${stripeClipId})`}
            opacity={0.88}
          />
        )}

        {/* Left armrest */}
        <rect x={-W / 2} y={-ARM_H / 2} width={ARM_W} height={ARM_H} rx={1} fill={armrest} />
        {/* Right armrest */}
        <rect x={W / 2 - ARM_W} y={-ARM_H / 2} width={ARM_W} height={ARM_H} rx={1} fill={armrest} />

        {/* ── Impaired: wheelchair on blue badge ── */}
        {condition === 'Impaired' && (
          <g transform={ICON_TRANSFORM}>
            <rect x={-11} y={-14} width={22} height={23} rx={4} ry={4} fill="#1155AA" opacity={0.92} />
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
            <rect x={-11} y={-14} width={22} height={23} rx={4} ry={4} fill="#5D1500" opacity={0.92} />
            <path d="M -8 -4 C -4 -11 6 -11 9 -4 C 6 3 -4 3 -8 -4 Z" fill="white" />
            <circle cx="1" cy="-4" r="3.2" fill="#6D3B00" />
            <circle cx="1" cy="-4" r="1.8" fill="#111" />
            <circle cx="2.2" cy="-5" r="0.7" fill="white" opacity="0.8" />
            <line x1="-9" y1="-12" x2="9" y2="6" stroke="#1a0000" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="-9" y1="-12" x2="9" y2="6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* ── Staff: yellow badge with person + STAFF text ── */}
        {condition === 'Staff' && (
          <g transform={ICON_TRANSFORM}>
            <rect x={-11} y={-14} width={22} height={23} rx={4} ry={4} fill="#FFD600" opacity={0.97} />
            <circle cx="1" cy="-9" r="3" fill="#424242" />
            <path d="M -6 0 C -6 -6 8 -6 8 0 Z" fill="#424242" />
            <line x1="-9" y1="2" x2="9" y2="2" stroke="#C8A000" strokeWidth="0.8" />
            <text x="1" y="8" fontSize="6.5" fontWeight="900" textAnchor="middle" fill="#212121"
              style={{ fontFamily: 'Arial, sans-serif', userSelect: 'none' }}>
              STAFF
            </text>
          </g>
        )}

        {/* ── Baby: baby girl face with bow on pink badge ── */}
        {condition === 'Baby' && (
          <g transform={ICON_TRANSFORM}>
            <rect x={-11} y={-14} width={22} height={23} rx={4} ry={4} fill="#EC407A" opacity={0.88} />
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

        {/* Seat number */}
        <text x={0} y={5} fontSize="14" fontWeight="bold"
          textAnchor="middle" fill={text}
          style={{
            userSelect: 'none',
            filter: hasTopLeftIcon ? 'drop-shadow(0 0px 2.5px rgba(0,0,0,0.90))' : undefined,
          }}>
          {number}
        </text>
      </g>
    </svg>
  );
};

// ── Single legend entry ───────────────────────────────────────────────────────
const LegendEntry: React.FC<{
  base: string;
  backrest: string;
  armrest: string;
  text: string;
  label: string;
  number?: number;
  condition?: SpecialCondition;
  exampleBase?: string;
  exampleBackrest?: string;
  exampleText?: string;
}> = ({ base, backrest, armrest, text, label, number, condition, exampleBase, exampleBackrest, exampleText }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    borderRadius: 8,
    background: 'rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.10)',
    minWidth: 64,
  }}>
    <div style={{ display: 'flex', gap: 4 }}>
      <MiniSeat
        base={base} backrest={backrest} armrest={armrest} text={text}
        number={number} condition={condition}
        seatKey={condition ? `${condition}-a` : 'plain-a'}
      />
      {exampleBase && (
        <MiniSeat
          base={exampleBase} backrest={exampleBackrest!} armrest={armrest} text={exampleText!}
          number={number} condition={condition}
          seatKey={condition ? `${condition}-b` : 'plain-b'}
        />
      )}
    </div>
    <span style={{
      fontSize: 11,
      fontWeight: 500,
      color: 'rgba(0,0,0,0.65)',
      fontFamily: 'system-ui, sans-serif',
      textAlign: 'center',
      lineHeight: 1.2,
      maxWidth: 88,
    }}>
      {label}
    </span>
  </div>
);

// ── Legend ────────────────────────────────────────────────────────────────────
const LayoutLegend: React.FC<LayoutLegendProps> = ({
  conditions,
  showStatusLegend = false,
  isEditView = false,
}) => {
  const { t } = useTranslation();

  const STATUS_ENTRIES = [
    { base: '#1B5E20', backrest: '#2E7D32', armrest: '#145218', text: '#fff', label: t('Available') },
    { base: '#1565C0', backrest: '#1976D2', armrest: '#0D47A1', text: '#fff', label: t('Selected') },
    { base: '#616161', backrest: '#757575', armrest: '#424242', text: '#eee', label: t('Booked') },
  ];

  const visibleConditions = isEditView
    ? conditions
    : conditions.filter(c => /*c !== 'Absent' &&*/ c !== 'Staff');

  if (visibleConditions.length === 0 && !showStatusLegend) return null;

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '14px 16px 10px',
      marginTop: 4,
      borderTop: '1px solid rgba(0,0,0,0.10)',
      background: 'rgba(0,0,0,0.02)',
      borderRadius: '0 0 8px 8px',
    }}>

      {/* Status entries — booking view only */}
      {showStatusLegend && STATUS_ENTRIES.map((e, i) => (
        <LegendEntry key={e.label} number={i + 1}
          base={e.base} backrest={e.backrest} armrest={e.armrest}
          text={e.text} label={e.label}
        />
      ))}

      {/* Divider */}
      {showStatusLegend && visibleConditions.length > 0 && (
        <div style={{
          width: 1, alignSelf: 'stretch', minHeight: 60,
          background: 'rgba(0,0,0,0.12)', margin: '0 4px',
        }} />
      )}

      {/* Condition entries */}
      {visibleConditions.map((c, i) => {
        const col = CONDITION_COLORS[c];
        if (!col) return null; // unknown condition — skip rather than crash

        if (isEditView) {
          return (
            <LegendEntry key={c} number={i + 1}
              base={col.base} backrest={col.backrest}
              armrest={col.armrest} text={col.text}
              label={t(col.label)} condition={c}
            />
          );
        }

        // Booking view: two seats — available + booked body, both with the condition icon
        return (
          <LegendEntry key={c} number={i + 1}
            base="#1B5E20" backrest="#2E7D32"
            armrest={col.armrest} text="#FFFFFF"
            label={t(col.label)} condition={c}
            exampleBase="#616161"
            exampleBackrest="#757575"
            exampleText="#E0E0E0"
          />
        );
      })}
    </div>
  );
};

export default LayoutLegend;
