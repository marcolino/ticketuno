import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CancelIcon from '@mui/icons-material/Cancel';

interface TagSelectorProps {
  /** Label shown above the chip group */
  label: string;
  /** Key used to persist custom options in localStorage */
  storageKey: string;
  /** Built-in options that are always shown (not deletable) */
  presetOptions: string[];
  /** Currently selected values */
  value: string[];
  /** Called whenever selection changes */
  onChange: (selected: string[]) => void;
}

const TagSelector = ({
  label,
  storageKey,
  presetOptions,
  value,
  onChange,
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

  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  // Persist custom options whenever they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(customOptions));
  }, [customOptions, storageKey]);

  const allOptions = [...presetOptions, ...customOptions];

  const handleToggle = (option: string) => {
    onChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option],
    );
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    if (allOptions.some((o) => o.toLowerCase() === trimmed.toLowerCase())) {
      setInputError(t('Duplicated tag'));
      return;
    }

    setCustomOptions((prev) => [...prev, trimmed]);
    // Auto-select the newly added option
    onChange([...value, trimmed]);
    setInputValue('');
    setInputError('');
  };

  const handleRemoveCustom = (option: string) => {
    setCustomOptions((prev) => prev.filter((o) => o !== option));
    onChange(value.filter((v) => v !== option));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {label}
      </Typography>

      {/* Chip grid */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2,
        }}
      >
        {presetOptions.map((option) => (
          <Chip
            key={option}
            label={option}
            onClick={() => handleToggle(option)}
            color={value.includes(option) ? 'primary' : 'default'}
            variant={value.includes(option) ? 'filled' : 'outlined'}
          />
        ))}

        {customOptions.map((option) => (
          <Chip
            key={option}
            label={option}
            onClick={() => handleToggle(option)}
            color={value.includes(option) ? 'secondary' : 'default'}
            variant={value.includes(option) ? 'filled' : 'outlined'}
            onDelete={() => handleRemoveCustom(option)}
            deleteIcon={
              <Tooltip title={t('Remove this tag')}>
                <CancelIcon />
              </Tooltip>
            }
          />
        ))}
      </Box>

      {/* Add custom option */}
      <TextField
        size="small"
        placeholder={t('Add a custom tag')}
        value={inputValue}
        onChange={(e) => { setInputValue(e.target.value); if (inputError) setInputError(''); }}
        onKeyDown={handleKeyDown}
        error={!!inputError}
        helperText={inputError}
        sx={{ width: { xs: '100%', sm: 260 } }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={t('Add a custom tag')}>
                <span>
                  <IconButton
                    onClick={handleAdd}
                    disabled={!inputValue.trim()}
                    edge="end"
                    size="small"
                    color="primary"
                  >
                    <AddCircleOutlineIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    </Box>
  );
}

export default TagSelector;
