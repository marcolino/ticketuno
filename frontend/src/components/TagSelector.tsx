import { useState, useEffect, useRef } from 'react';
import {
  FormControl, InputLabel, OutlinedInput,
  Chip, IconButton, TextField, Tooltip, Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';

type TagSelectorProps =
  | {
      multiple: true;
      value: string[];
      onChange: (selected: string[]) => void;
      label: string;
      storageKey: string;
      presetOptions: string[];
      fullWidth?: boolean;
    }
  | {
      multiple?: false;
      value: string;
      onChange: (selected: string) => void;
      label: string;
      storageKey: string;
      presetOptions: string[];
      fullWidth?: boolean;
    };

const TagSelector = ({
  label,
  storageKey,
  presetOptions,
  value,
  onChange,
  multiple = false,
  fullWidth = true,
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

  // Normalise value to string[] internally for uniform logic
  const selectedArray: string[] = multiple
    ? (value as string[])
    : value
      ? [value as string]
      : [];

  const emitChange = (next: string[]) => {
    if (multiple) {
      (onChange as (v: string[]) => void)(next);
    } else {
      (onChange as (v: string) => void)(next[0] ?? '');
    }
  };

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

  const handleShowClick = () => {
    if (mode === 'show') setMode('pick');
  };

  const handleToggle = (option: string) => {
    if (multiple) {
      emitChange(
        selectedArray.includes(option)
          ? selectedArray.filter((v) => v !== option)
          : [...selectedArray, option]
      );
    } else {
      emitChange(selectedArray.includes(option) ? [] : [option]);
      setMode('show');   // ← auto-close on single select
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
    emitChange(multiple ? [...selectedArray, trimmed] : [trimmed]);
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
    emitChange(selectedArray.filter((v) => v !== option));
  };

  // ── Show mode ─────────────────────────────────────────────────────────────
  const showContent = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', py: 2, pr: 1.5, width: '100%' }}>
      {selectedArray.length === 0 ? (
        <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.875rem' }}>
          {t('None')}
        </Box>
      ) : (
        selectedArray.map((option) => (
          <Chip
            key={option}
            label={option}
            size="small"
            color={presetOptions.includes(option) ? 'primary' : 'secondary'}
            variant="filled"
          />
        ))
      )}
    </Box>
  );

  // ── Pick mode ─────────────────────────────────────────────────────────────
  const pickContent = (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', py: 2, width: '100%' }}>
      {presetOptions.map((option) => (
        <Chip
          key={option}
          label={option}
          size="small"
          onClick={() => handleToggle(option)}
          color={selectedArray.includes(option) ? 'primary' : 'default'}
          variant={selectedArray.includes(option) ? 'filled' : 'outlined'}
        />
      ))}

      {customOptions.map((option) => (
        <Chip
          key={option}
          label={option}
          size="small"
          onClick={() => handleToggle(option)}
          color={selectedArray.includes(option) ? 'secondary' : 'default'}
          variant={selectedArray.includes(option) ? 'filled' : 'outlined'}
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
            sx={{ width: 90, '& input': { fontSize: '0.9rem' } }}
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
        onClick={handleShowClick}
        onBlur={handleContainerBlur}
        inputProps={{ style: { width: 0, padding: 0, height: 0 } }}
        startAdornment={mode === 'show' ? showContent : pickContent}
        sx={{
          alignItems: 'flex-start',
          cursor: mode === 'show' ? 'pointer' : 'default',
        }}
      />
    </FormControl>
  );
};

export default TagSelector;
