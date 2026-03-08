import { useState, useEffect, useRef } from 'react';
import {
  FormControl, InputLabel, OutlinedInput,
  Chip, IconButton, TextField, Tooltip, Box,
} from '@mui/material';
import {
  AddCircleOutline as AddCircleOutlineIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
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

  const [adding, setAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(customOptions));
  }, [customOptions, storageKey]);

  const allOptions = [...presetOptions, ...customOptions];

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
    if (!trimmed) { handleCancel(); return; }
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

  const handleCancel = () => {
    setAdding(false);
    setInputValue('');
    setInputError('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
    if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
  };

  const handleRemoveCustom = (e: React.MouseEvent, option: string) => {
    e.stopPropagation();
    setCustomOptions((prev) => prev.filter((o) => o !== option));
    onChange(value.filter((v) => v !== option));
  };

  return (
    <FormControl fullWidth={fullWidth} variant="outlined">
      <InputLabel shrink focused={focused}>{label}</InputLabel>
      <OutlinedInput
        notched
        label={label}
        readOnly
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputProps={{ style: { width: 0, padding: 0, height: 0 } }}
        startAdornment={
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', py: 1 }}>
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
                  sx={{ width: 90 }}
                  inputProps={{
                    style: { fontSize: '0.75rem' },
                  }}
                />
                <Tooltip title={t('Confirm')}>
                  <span>
                    <IconButton size="small" color="primary" onClick={handleConfirm} disabled={!inputValue.trim()}>
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title={t('Cancel')}>
                  <IconButton size="small" onClick={handleCancel}>
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ) : (
              <Tooltip title={t('Add custom tag')}>
                <IconButton size="small" color="primary" onClick={handleStartAdding}>
                  <AddCircleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        }
        sx={{ alignItems: 'flex-start', cursor: 'default' }}
      />
    </FormControl>
  );
};

export default TagSelector;
