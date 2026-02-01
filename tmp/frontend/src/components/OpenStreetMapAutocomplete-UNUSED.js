import React, { useState, useEffect, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { OpenStreetMapProvider } from 'leaflet-geosearch';

const OpenStreetMapAutocomplete = ({ value, onChange, placeholder = "Indirizzo stradale" }) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
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
        // Search for addresses, restricting results to Italy[citation:1]
        const results = await provider.search({ 
          query: inputValue, 
          countrycodes: 'it' 
        });
        
        // The results are already in the format: { label: 'Formatted Address', ... }[citation:1]
        if (active) {
          setOptions(results);
        }
      } catch (error) {
        console.error("Geosearch error:", error);
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
      // Use 'id' instead of 'getOptionKey' which is not a standard prop[citation:2]
      // MUI uses 'getOptionKey' for internal keys. For React keys, you can map options.
      renderOption={(props, option) => {
        const key = typeof option === 'string' ? option : `${option.x},${option.y}`;
        return <li {...props} key={key}>{typeof option === 'string' ? option : option.label}</li>;
      }}
      value={value}
      onChange={(event, newValue) => {
        // This fires on selection (click or Enter on a suggestion)
        const addressString = typeof newValue === 'string' ? newValue : newValue?.label || '';
        onChange(addressString);
        // Also sync the input field's displayed text
        setInputValue(addressString);
      }}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
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
