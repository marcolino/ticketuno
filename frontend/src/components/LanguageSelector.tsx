import React from 'react';
import { useTranslation } from 'react-i18next';
import { Select, MenuItem, FormControl, InputLabel, SelectChangeEvent } from '@mui/material';

const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();

  const handleChange = (event: SelectChangeEvent) => {
    i18n.changeLanguage(event.target.value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <InputLabel>{t('Language')}</InputLabel>
      <Select
        value={i18n.language}
        label={t('Language')}
        onChange={handleChange}
      >
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="it">Italiano</MenuItem>
        <MenuItem value="fr">Français</MenuItem>
      </Select>
    </FormControl>
  );
};

export default LanguageSelector;
