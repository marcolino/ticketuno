import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  //Chip,
  Tooltip,
  Typography,
  Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { CONDITION_COLORS } from './LayoutSeat';
import { SpecialCondition } from '@/shared/types/layoutToSeats';

// ── Condition entries in display order ────────────────────────────────────────
// 'Normal' is a pseudo-condition meaning "remove any special condition"
export type MarkingCondition = SpecialCondition | 'Normal';

interface ConditionDef {
  value: MarkingCondition;
  label: string;
  base: string;
  text: string;
  border: string;
}

const CONDITIONS: ConditionDef[] = [
  {
    value:  'Normal',
    label:  'Normale',
    base:   '#730008',
    text:   '#f0f0f0',
    border: '#3B1F1F',
  },
  ...( Object.entries(CONDITION_COLORS) as [SpecialCondition, typeof CONDITION_COLORS[SpecialCondition]][])
    .map(([key, col]) => ({
      value: key,
      label: col.label,
      base: col.base,
      text: col.text,
      border: col.armrest,
    })),
];

// ── Mini seat chip ─────────────────────────────────────────────────────────────
const SeatChip: React.FC<{
  def: ConditionDef;
  selected: boolean;
  onClick: () => void;
}> = ({ def, selected, onClick }) => {
  const { t } = useTranslation();

  return (
    <Tooltip title={def.label} placement="top" >
      <Box
        onClick={onClick}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '4px 6px',
          borderRadius: '8px',
          border: selected
            ? '2px solid #1976D2'
            : '2px solid transparent',
          background: selected
            ? 'rgba(25,118,210,0.12)'
            : 'transparent',
          transition: 'all 0.15s ease',
          '&:hover': {
            background: selected
              ? 'rgba(25,118,210,0.18)'
              : 'rgba(0,0,0,0.06)',
            transform: 'scale(1.08)',
          },
        }}
      >
        {/* Mini seat SVG */}
        <svg width={36} height={36} viewBox="-18 -18 36 36">
          <g transform="translate(0, -3)">
            {/* Cushion */}
            <rect x={-13} y={-9} width={26} height={18} rx={4}
              fill={def.base} stroke={def.border} strokeWidth="1" />
            {/* Backrest */}
            <rect x={-11} y={7} width={22} height={9} rx={3}
              fill={def.base}
              style={{ filter: 'brightness(1.2)' }}
              stroke={def.border} strokeWidth="1" />
            {/* Left armrest */}
            <rect x={-17} y={-8} width={3} height={18} rx={1} fill={def.border} />
            {/* Right armrest */}
            <rect x={14} y={-8} width={3} height={18} rx={1} fill={def.border} />
            {/* "N" label for Normal, condition letter otherwise */}
            <text x={0} y={4}
              fontSize="10" fontWeight="bold"
              textAnchor="middle" fill={def.text}
              style={{ userSelect: 'none', pointerEvents: 'none' }}>
              {def.value === 'Normal' ? 'N' : def.value.charAt(0)}
            </text>
          </g>
          {/* Selected indicator ring */}
          {selected && (
            <circle cx={0} cy={0} r={17}
              fill="none"
              stroke="#1976D2"
              strokeWidth={2}
              strokeDasharray="4 3"
              opacity={0.7}
            />
          )}
        </svg>
        {/* Label */}
        <Typography sx={{
          fontSize: '9px',
          fontWeight: selected ? 700 : 500,
          color: selected ? '#1976D2' : 'text.secondary',
          lineHeight: 1,
          textAlign: 'center',
          maxWidth: 52,
        }}>
          {t(def.label)}
        </Typography>
      </Box>
    </Tooltip>
  );
};

// ── Main toolbar ───────────────────────────────────────────────────────────────
interface SeatMarkingToolbarProps {
  active: boolean;
  selectedCondition: MarkingCondition | null;
  onToggleActive: () => void;
  onSelectCondition: (c: MarkingCondition) => void;
}

const SeatMarkingToolbar: React.FC<SeatMarkingToolbarProps> = ({
  active,
  selectedCondition,
  onToggleActive,
  onSelectCondition,
}) => {
  const { t } = useTranslation();

  return (
    <Box /*sx={{ mb: 2 }}*/>
      {/* Toggle button */}
      <Button
        variant={'contained'}
        color={active ? 'info' : 'inherit'}
        size="small"
        startIcon={active ? <CloseIcon /> : <EditIcon />}
        onClick={onToggleActive}
        sx={{ mb: active ? 1 : 0 }}
      >
        {active ? t('Leave mark mode') : t('Mark special seats')}
      </Button>

      {/* Condition palette — only shown when active */}
      <Collapse in={active}>
        <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          p: 1,
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'warning.main',
          background: 'rgba(255,152,0,0.04)',
          mt: 0.5,
        }}>
          {CONDITIONS.map(def => (
            <SeatChip
              key={def.value}
              def={def}
              selected={selectedCondition === def.value}
              onClick={() => onSelectCondition(def.value)}
            />
          ))}
        </Box>

        {/* Instruction hint */}
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 0.5, pl: 0.5 }}>
          {selectedCondition
            ? t('Click a seat to apply {{condition}}',
              { condition: t(CONDITIONS.find(c => c.value === selectedCondition)?.label ?? '') })
            : t('Select a condition, then click the seat(s)')
          }
        </Typography>
      </Collapse>
    </Box>
  );
};

export default SeatMarkingToolbar;
