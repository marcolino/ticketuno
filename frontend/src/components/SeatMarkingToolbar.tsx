import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Tooltip,
  Typography,
  Collapse,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { CONDITION_COLORS } from './LayoutSeat';
import { SpecialCondition } from '@ticketuno/shared/types/seat';
import SeatMiniSVG from './SeatMiniSVG';

// ── Condition entries in display order ────────────────────────────────────────
export type MarkingCondition = SpecialCondition | 'Normal';

interface ConditionDef {
  value: MarkingCondition;
  label: string;
}

const CONDITIONS: ConditionDef[] = [
  { value: 'Normal', label: 'Normal' },
  ...(Object.entries(CONDITION_COLORS) as [SpecialCondition, typeof CONDITION_COLORS[SpecialCondition]][])
    .map(([key, col]) => ({
      value: key,
      label: col.label,
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
    <Tooltip title={t(def.label)} placement="top">
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
          border: selected ? '2px solid #1976D2' : '2px solid transparent',
          background: selected ? 'rgba(25,118,210,0.12)' : 'transparent',
          transition: 'all 0.15s ease',
          '&:hover': {
            background: selected ? 'rgba(25,118,210,0.18)' : 'rgba(0,0,0,0.06)',
            transform: 'scale(1.08)',
          },
        }}
      >
        <SeatMiniSVG
          condition={def.value}
          seatKey={`toolbar-${def.value}`}
        />
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
    <Box>
      <Button
        variant="contained"
        color={active ? 'info' : 'inherit'}
        size="small"
        startIcon={active ? <CloseIcon /> : <EditIcon />}
        onClick={onToggleActive}
        sx={{ mb: active ? 1 : 0 }}
      >
        {active ? t('Leave mark mode') : t('Mark special seats')}
      </Button>

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
