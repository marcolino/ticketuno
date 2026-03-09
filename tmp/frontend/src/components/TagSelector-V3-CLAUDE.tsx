import { useState, useEffect, useRef } from 'react';
import {
  FormControl, InputLabel, OutlinedInput,
  Chip, IconButton, TextField, Tooltip, Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

interface TagSelectorProps {
  label: string;
  storageKey: string;
  presetOptions: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  fullWidth?: boolean;
}

const TagSelector = ({
  label,
  storageKey,
  presetOptions,
  value,
  onChange,
  multiple = true,
  fullWidth = false,
}: TagSelectorProps) => {
  const { t } = useTranslation();

  const [customOptions, setCustomOptions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [mode, setMode] = useState<'show' | 'pick'>('show');
  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(customOptions));
  }, [customOptions, storageKey]);

  const allOptions = [...presetOptions, ...customOptions];

  // Exit pick mode when focus leaves the whole component
  const handleContainerBlur = () => {
    setTimeout(() => {
      if (containerRef.current && !containerRef.current.contains(document.activeElement)) {
        setMode('show');
        setAdding(false);
        setInputValue('');
        setInputError('');
      }
    }, 0);
  };

  const handleToggle = (option: string) => {
    if (multiple) {
      onChange(
        value.includes(option)
          ? value.filter((v) => v !== option)
          : [...value, option]
      );
    } else {
      onChange(value.includes(option) ? [] : [option]);
    }
  };

  const handleStartAdding = () => {
    setAdding(true);
    setInputValue('');
    setInputError('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleConfirm = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) { handleCancelAdd(); return; }
    if (allOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      setInputError(t('Already exists'));
      return;
    }
    setCustomOptions((prev) => [...prev, trimmed]);
    onChange(multiple ? [...value, trimmed] : [trimmed]);
    setAdding(false);
    setInputValue('');
    setInputError('');
  };

  const handleCancelAdd = () => {
    setAdding(false);
    setInputValue('');
    setInputError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
    if (e.key === 'Escape') { e.preventDefault(); handleCancelAdd(); }
  };

  const handleRemoveCustom = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    setCustomOptions((prev) => prev.filter((o) => o !== option));
    onChange(value.filter((v) => v !== option));
  };

  // ── Show mode ─────────────────────────────────────────────────────────────
  const showContent = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', py: 0.75 }}>
      {value.length === 0 && (
        <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
          {t('None')}
        </Box>
      )}
      {value.map((option) => (
        <Chip
          key={option}
          label={option}
          size="small"
          color={presetOptions.includes(option) ? 'primary' : 'secondary'}
          variant="filled"
        />
      ))}
      <Tooltip title={t('Edit')}>
        <IconButton
          size="small"
          color="primary"
          onClick={() => setMode('pick')}
          sx={{ ml: 0.5 }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  // ── Pick mode ─────────────────────────────────────────────────────────────
  const pickContent = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', py: 0.75 }}>
      {presetOptions.map((option) => (
        <Chip
          key={option}
          label={option}
          size="small"
          onClick={() => handleToggle(option)}
          color={value.includes(option) ? 'primary' : 'default'}
          variant={value.includes(option) ? 'filled' : 'outlined'}
        />
      ))}

      {customOptions.map((option) => (
        <Chip
          key={option}
          label={option}
          size="small"
          onClick={() => handleToggle(option)}
          color={value.includes(option) ? 'secondary' : 'default'}
          variant={value.includes(option) ? 'filled' : 'outlined'}
          onDelete={(e) => handleRemoveCustom(e, option)}
          deleteIcon={
            <Tooltip title={t('Remove option')}>
              <CancelIcon />
            </Tooltip>
          }
        />
      ))}

      {adding ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <TextField
            inputRef={inputRef}
            size="small"
            variant="standard"
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); if (inputError) setInputError(''); }}
            onKeyDown={handleKeyDown}
            error={!!inputError}
            title={inputError}
            placeholder={t('New tag...')}
            sx={{ width: 90, '& input': { fontSize: '0.75rem' } }}
          />
          <Tooltip title={t('Confirm')}>
            <span>
              <IconButton size="small" color="primary" onClick={handleConfirm} disabled={!inputValue.trim()}>
                <CheckIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('Cancel')}>
            <IconButton size="small" onClick={handleCancelAdd}>
              <CancelIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        <Tooltip title={t('Add custom tag')}>
          <IconButton size="small" color="primary" onClick={handleStartAdding}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      {/* Close pick mode explicitly */}
      <Tooltip title={t('Done')}>
        <IconButton size="small" onClick={() => setMode('show')} sx={{ ml: 'auto' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );

  return (
    <FormControl fullWidth={fullWidth} variant="outlined">
      <InputLabel shrink focused={mode === 'pick'}>{label}</InputLabel>
      <OutlinedInput
        ref={containerRef}
        notched
        label={label}
        readOnly
        onBlur={handleContainerBlur}
        inputProps={{ style: { width: 0, padding: 0, height: 0 } }}
        startAdornment={mode === 'show' ? showContent : pickContent}
        sx={{ alignItems: 'flex-start', cursor: 'default' }}
      />
    </FormControl>
  );
};

export default TagSelector;
