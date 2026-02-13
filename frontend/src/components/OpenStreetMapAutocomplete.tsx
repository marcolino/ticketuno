import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { OpenStreetMapProvider } from 'leaflet-geosearch';

// Define TypeScript interfaces
interface OpenStreetMapResult {
  label: string;
  x: number;
  y: number;
  [key: string]: any; // For other properties that might be in the result
}

interface OpenStreetMapAutocompleteProps {
  name?: string;
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
}

const OpenStreetMapAutocomplete: React.FC<OpenStreetMapAutocompleteProps> = ({ 
  value, 
  name,
  onChange,
  placeholder = 'Indirizzo stradale' 
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<OpenStreetMapResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Initialize the provider. useMemo prevents recreating it on every render.
  const provider = useMemo(() => new OpenStreetMapProvider(), []);

  // Fetch suggestions with a delay (debouncing)
  useEffect(() => {
    let active = true; // Flag to prevent state updates on outdated async calls

    if (inputValue.trim().length < 3) {
      setOptions([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        // Search for addresses. Note: countrycodes might not be supported in all versions
        // If you get type errors with countrycodes, you can either:
        // 1. Cast to any: await provider.search({ query: inputValue } as any)
        // 2. Or check if it's supported in your version of leaflet-geosearch
        const results = await provider.search({ query: inputValue });
        
        // Filter results for Italy if needed (client-side filtering)
        const italianResults = results.filter((result: OpenStreetMapResult) => 
          result.label.toLowerCase().includes('italy') || 
          result.label.toLowerCase().includes('italia') ||
          // You can add more specific filtering logic here
          true // Remove this line if you want strict filtering
        );
        
        if (active) {
          setOptions(italianResults);
        }
      } catch (error) {
        console.error('Geosearch error:', error);
        if (active) setOptions([]);
      } finally {
        if (active) setLoading(false);
      }
    }, 300); // Wait 300ms after the user stops typing

    return () => {
      active = false; // Cleanup for the async call
      clearTimeout(timer);
    };
  }, [inputValue, provider]);

  return (
    <Autocomplete
      freeSolo
      filterOptions={(x) => x}
      options={options}
      loading={loading}
      getOptionLabel={(option) => 
        typeof option === 'string' ? option : option.label
      }
      renderOption={(props, option) => {
        const key = typeof option === 'string' ? option : `${option.x},${option.y}`;
        return <li {...props} key={key}>{typeof option === 'string' ? option : option.label}</li>;
      }}
      value={value}
      onChange={(_event, newValue) => {
        // This fires on selection (click or Enter on a suggestion)

        const addressString = typeof newValue === 'string' ? newValue : newValue?.label || '';
        onChange({ target: { name: name || 'address', value: addressString } } as any);
        

        // const addressString = typeof newValue === 'string' ? newValue : newValue?.label || '';
        // onChange(addressString);

        // Also sync the input field's displayed text
        setInputValue(addressString);
      }}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          // KEY ADDITION: Capture free text when field loses focus
          onBlur={(event) => {
            // If the user typed something but didn't select a suggestion,
            // treat the typed text as the final value.
            if (event.target.value !== value) {
              onChange(event.target.value);
            }
          }}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
            style: { 
              boxSizing: 'border-box'
            }
          }}
        />
      )}
    />
  );
};

export default OpenStreetMapAutocomplete;
