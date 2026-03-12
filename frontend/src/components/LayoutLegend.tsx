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

// ── Mini seat — body and armrest colors are independent ───────────────────────
const MiniSeat: React.FC<{
  base: string;
  backrest: string;
  armrest: string;   // condition color — always armrest-only
  text: string;
  number?: number;
}> = ({ base, backrest, armrest, text, number = 1 }) => (
  <svg width={W} height={H} viewBox={`${-W/2} ${-H/2} ${W} ${H}`}>
    <g transform="translate(0, -4)">
      {/* Cushion */}
      <rect x={-BASE_W/2} y={-BASE_H/2} width={BASE_W} height={BASE_H}
        rx={6} fill={base} stroke={armrest} strokeWidth="1.5" />
      {/* Backrest */}
      <rect x={-BASE_W/2+2} y={BASE_H/2-8} width={BASE_W-4} height={BACK_H}
        rx={4} fill={backrest} stroke={armrest} strokeWidth="1.5" />
      {/* Left armrest */}
      <rect x={-W/2} y={-ARM_H/2} width={ARM_W} height={ARM_H}
        rx={1} fill={armrest} />
      {/* Right armrest */}
      <rect x={W/2-ARM_W} y={-ARM_H/2} width={ARM_W} height={ARM_H}
        rx={1} fill={armrest} />
      {/* Number */}
      <text x={0} y={5} fontSize="14" fontWeight="bold"
        textAnchor="middle" fill={text}
        style={{ userSelect: 'none' }}>
        {number}
      </text>
    </g>
  </svg>
);

// ── Single legend entry ───────────────────────────────────────────────────────
const LegendEntry: React.FC<{
  base: string;
  backrest: string;
  armrest: string;
  text: string;
  label: string;
  number?: number;
  // Optional: show a second "example" seat with a different body status
  // to illustrate condition-on-booked-seat
  exampleBase?: string;
  exampleBackrest?: string;
  exampleText?: string;
}> = ({ base, backrest, armrest, text, label, number, exampleBase, exampleBackrest, exampleText }) => {
  return (
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
        {/* Primary seat */}
        <MiniSeat base={base} backrest={backrest} armrest={armrest} text={text} number={number} />
        {/* Example: same condition on a booked seat — only shown for condition entries */}
        {exampleBase && (
          <MiniSeat
            base={exampleBase}
            backrest={exampleBackrest!}
            armrest={armrest}          // same condition armrest
            text={exampleText!}
            number={number}
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
};

// ── Legend ────────────────────────────────────────────────────────────────────
const LayoutLegend: React.FC<LayoutLegendProps> = ({
  conditions,
  showStatusLegend = false,
  isEditView = false,
}) => {
  const { t } = useTranslation();

  // ── Status entries (booking view) ─────────────────────────────────────────────
  const STATUS_ENTRIES = [
    { base: '#1B5E20', backrest: '#2E7D32', armrest: '#145218', text: '#fff', label: t('Available') },
    { base: '#1565C0', backrest: '#1976D2', armrest: '#0D47A1', text: '#fff', label: t('Selected') },
  //{ base: '#F57C00', backrest: '#FB8C00', armrest: '#E65100', text: '#fff', label: 'Riservato'     },
    { base: '#616161', backrest: '#757575', armrest: '#424242', text: '#eee', label: t('Booked') },
  ];
  // Important: we do show users the 'reserved' (by other users) seats as 'booked', to reduce confusion...

  const visibleConditions = isEditView
    ? conditions
    : conditions.filter(c => c !== 'Absent' && c !== 'Staff');

  if (visibleConditions.length === 0 && !showStatusLegend) return null;

  return (
    <div style={{
      display:        'flex',
      flexWrap:       'wrap',
      gap:            10,
      justifyContent: 'center',
      alignItems:     'flex-start',
      padding:        '14px 16px 10px',
      marginTop:      4,
      borderTop:      '1px solid rgba(0,0,0,0.10)',
      background:     'rgba(0,0,0,0.02)',
      borderRadius:   '0 0 8px 8px',
    }}>

      {/* Status entries — booking view only, no example seat needed */}
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

        // In edit view: full condition colors everywhere (no split needed)
        if (isEditView) {
          return (
            <LegendEntry key={c} number={i + 1}
              base={col.base} backrest={col.backrest}
              armrest={col.armrest} text={col.text}
              label={col.label}
            />
          );
        }

        // In booking view: show two seats side by side —
        //   left: available body + condition armrest
        //   right: booked body + same condition armrest
        // so the user understands armrest = condition, body = status
        return (
          <LegendEntry key={c} number={i + 1}
            // Available body
            base="#1B5E20" backrest="#2E7D32"
            armrest={col.armrest}
            text="#FFFFFF"
            label={col.label}
            // Booked body example
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
