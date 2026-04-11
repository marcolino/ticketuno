import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONDITION_COLORS } from './LayoutSeat';
import { SpecialCondition } from '@/shared/types/seat';
import SeatMiniSVG from './SeatMiniSVG';

interface LayoutLegendProps {
  conditions: SpecialCondition[];
  showStatusLegend?: boolean;
  isEditView?: boolean;
}

// ── Status-only mini seat (no condition icon needed) ─────────────────────────
const StatusSeat: React.FC<{
  base: string; backrest: string; armrest: string; text: string; number: number;
}> = ({ base, backrest, armrest, text, number }) => (
  <svg width={36} height={36} viewBox="-18 -18 36 36">
    <g transform="translate(0, -3)">
      <rect x={-13} y={-9} width={26} height={18} rx={4} fill={base} stroke={armrest} strokeWidth="1" />
      <rect x={-11} y={7} width={22} height={9} rx={3} fill={backrest} stroke={armrest} strokeWidth="1" />
      <rect x={-17} y={-8} width={3} height={18} rx={1} fill={armrest} />
      <rect x={14} y={-8} width={3} height={18} rx={1} fill={armrest} />
      <text x={0} y={4} fontSize="10" fontWeight="bold" textAnchor="middle" fill={text}
        style={{ userSelect: 'none' }}>{number}</text>
    </g>
  </svg>
);

// ── Single legend entry ───────────────────────────────────────────────────────
const LegendEntry: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
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
      {children}
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

  const visibleConditions = conditions;
  // const visibleConditions = isEditView
  //   ? conditions
  //   : conditions //.filter(c => c !== 'Absent' && c !== 'Staff');
  // ;

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
        <LegendEntry key={e.label} label={e.label}>
          <StatusSeat
            base={e.base} backrest={e.backrest} armrest={e.armrest}
            text={e.text} number={i + 1}
          />
        </LegendEntry>
      ))}

      {/* Divider between status and condition blocks */}
      {showStatusLegend && visibleConditions.length > 0 && (
        <div style={{
          width: 1, alignSelf: 'stretch', minHeight: 60,
          background: 'rgba(0,0,0,0.12)', margin: '0 4px',
        }} />
      )}

      {/* Condition entries */}
      {visibleConditions.map((c) => {
        const col = CONDITION_COLORS[c];
        if (!col) return null;

        if (isEditView) {
          // Edit view: single seat, full condition colors + icon
          return (
            <LegendEntry key={c} label={t(col.label)}>
              <SeatMiniSVG condition={c} seatKey={`${c}-edit`} />
            </LegendEntry>
          );
        }

        // Booking view: two seats side by side —
        //   left:  available (green) body + condition icon
        //   right: booked (grey) body + same condition icon
        return (
          <LegendEntry key={c} label={t(col.label)}>
            <SeatMiniSVG
              condition={c} seatKey={`${c}-avail`}
              baseOverride="#1B5E20" backrestOverride="#2E7D32" textOverride="#FFFFFF"
            />
            <SeatMiniSVG
              condition={c} seatKey={`${c}-booked`}
              baseOverride="#616161" backrestOverride="#757575" textOverride="#E0E0E0"
            />
          </LegendEntry>
        );
      })}
    </div>
  );
};

export default LayoutLegend;
