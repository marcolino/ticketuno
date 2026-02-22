import { useState, useRef, useCallback } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Chip,
  FormHelperText,
} from "@mui/material";

// Icons
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/**
 * SelectWithAdd
 *
 * Props:
 *   label           {string}               Field label shown above the select
 *   options         {{ key, value }[]}     Initial options list
 *   value           {string}               Controlled selected key
 *   onChange        {(key, value) => void} Called when selection changes
 *   helperText      {string}               Optional helper text below the field
 *   error           {bool}                 Puts the field in error state
 *   disabled        {bool}                 Disables the control
 *   fullWidth       {bool}                 Whether select takes full width
 *   allowDuplicates {bool}                 Allow adding duplicate values
 *   size            {'small'|'medium'}     MUI size variant
 *
 * Theme integration (theme.components.SelectWithAdd):
 *   All design tokens are read from the theme with per-token fallbacks, so
 *   the component works correctly even without the theme additions applied.
 */
type Option = { key: string; value: string };

interface SelectWithAddProps {
  label?: string;
  options?: Option[];
  value?: string;
  onChange?: (key: string, value: string) => void;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  allowDuplicates?: boolean;
  size?: 'small' | 'medium';
}

function SelectWithAdd({
  label = "Select",
  options: initialOptions = [],
  value: controlledValue,
  onChange,
  helperText,
  error = false,
  disabled = false,
  fullWidth = false,
  allowDuplicates = false,
  size = "medium",
}: SelectWithAddProps) {
  const theme = useTheme();

  // ── Resolve theme tokens with fallbacks ────────────────────────────────────
  // Top-level component namespace (added via themeAdditions)
  const ct = theme.components?.SelectWithAdd ?? {};

  const minWidth = ct.minWidth ?? 260;

  // Dropdown shadow - from customShadows if available, else a hardcoded default
  const menuShadow = theme.customShadows?.selectMenu ?? "0 8px 30px rgba(0,0,0,0.10)";

  // Primary color hex (always present in any MUI theme)
  const primaryHex = theme.palette.primary.main;

  // Key chip (shown in the trigger when key !== value)
  const kc = ct.keyChip ?? {};
  const keyChipHeight = kc.height ?? 18;
  const keyChipFontSize = kc.fontSize ?? "0.65rem";
  const keyChipFontWt = kc.fontWeight ?? 700;
  const keyChipBgAlpha = kc.bgAlpha ?? "14"; // ≈ 8%
  const keyChipBorderAlpha = kc.borderAlpha ?? "2E"; // ≈ 18%

  // Key chip muted (inside the list, non-selected rows)
  const kcm = ct.keyChipMuted ?? {};
  const keyChipMutedH = kcm.height ?? 17;
  const keyChipMutedFs = kcm.fontSize ?? "0.63rem";
  const keyChipMutedFw = kcm.fontWeight ?? 700;
  // Muted chip colors fall back to theme grey if available, else hardcoded
  const mutedBg = theme.palette.grey?.[100] ?? "#F3F4F6";
  const mutedColor = theme.palette.text.secondary;

  // Add-new section
  const as = ct.addSection ?? {};
  const addLabelFs = as.labelFontSize ?? "0.67rem";
  const addLabelFw = as.labelFontWeight ?? 700;
  const addLabelLs = as.labelLetterSpacing ?? "0.07em";
  const addInputFs = as.inputFontSize ?? "0.87rem";
  const addInputBr = as.inputBorderRadius ?? 1.5;
  const addBtnFs = as.addButtonFontSize ?? "0.68rem";
  const addBtnFw = as.addButtonFontWeight ?? 700;
  const addBtnLs = as.addButtonLetterSpacing ?? "0.06em";
  const addBtnPx = as.addButtonPaddingX ?? "8px";
  const addBtnPy = as.addButtonPaddingY ?? "2px";
  const addBtnBr = as.addButtonBorderRadius ?? "4px";

  // State
  const [options, setOptions] = useState(initialOptions);
  const [selected, setSelected] = useState(controlledValue ?? "");
  const [newLabel, setNewLabel] = useState("");
  const [addError, setAddError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const inputRef = useRef(null);

  const effectiveValue = controlledValue !== undefined ? controlledValue : selected;

  // Handlers
  const handleChange = (e) => {
    const key = e.target.value;
    setSelected(key);
    onChange?.(key, options.find((o) => o.key === key)?.value ?? key);
  };

  const handleAdd = useCallback(() => {
    const trimmed = newLabel.trim();
    if (!trimmed) { setAddError("Cannot be empty."); return; }
    if (!allowDuplicates && options.some(
      (o) => o.value.toLowerCase() === trimmed.toLowerCase()
    )) { setAddError("Already exists."); return; }

    const newOpt = { key: trimmed, value: trimmed };
    setOptions((prev) => [...prev, newOpt]);
    setNewLabel("");
    setAddError("");
    setSelected(trimmed);
    onChange?.(trimmed, trimmed);
    setMenuOpen(false);
  }, [newLabel, options, allowDuplicates, onChange]);

  const handleInputKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === "Enter")  handleAdd();
    if (e.key === "Escape") { setNewLabel(""); setAddError(""); setMenuOpen(false); }
  };

  // ── renderValue: shown in the closed trigger ───────────────────────────────
  const renderValue = (key) => {
    if (!key) return null;
    const opt = options.find((o) => o.key === key);
    if (!opt) return key;
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <span>{opt.value}</span>
        {opt.key !== opt.value && (
          <Chip
            label={opt.key}
            size="small"
            sx={{
              height: keyChipHeight,
              fontSize: keyChipFontSize,
              fontWeight: keyChipFontWt,
              bgcolor: `${primaryHex}${keyChipBgAlpha}`,
              color: "primary.main",
              border: `1px solid ${primaryHex}${keyChipBorderAlpha}`,
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
        )}
      </Box>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <FormControl
      fullWidth={fullWidth}
      error={error}
      disabled={disabled}
      size={size}
      sx={{ minWidth: fullWidth ? undefined : minWidth }}
    >
      {label && <InputLabel>{label}</InputLabel>}

      <Select
        value={effectiveValue}
        label={label}
        onChange={handleChange}
        open={menuOpen}
        onOpen={() => setMenuOpen(true)}
        onClose={() => { setMenuOpen(false); setNewLabel(""); setAddError(""); }}
        renderValue={effectiveValue ? renderValue : undefined}
        MenuProps={{
          disableAutoFocusItem: true,
          PaperProps: {
            sx: {
              mt: 0.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: menuShadow,
              "& .MuiList-root": { py: 0.5 },
            },
          },
        }}
      >
        {/* ── Empty state ─────────────────────────────────────────────────── */}
        {options.length === 0 && (
          <MenuItem disabled sx={{ fontStyle: "italic", color: "text.secondary", fontSize: "0.85rem" }}>
            No options — add one below
          </MenuItem>
        )}

        {/* ── Option rows ─────────────────────────────────────────────────── */}
        {options.map((opt) => {
          const isSelected = opt.key === effectiveValue;
          return (
            <MenuItem
              key={opt.key}
              value={opt.key}
              // mx/borderRadius/selected styles come from MuiMenuItem styleOverrides
              // in the theme additions — no need to repeat them here.
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                pr: 1.25,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: "0.9rem",
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? "primary.main" : "text.primary",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>
                  {opt.value}
                </Typography>

                {opt.key !== opt.value && (
                  <Chip
                    label={opt.key}
                    size="small"
                    sx={{
                      height: keyChipMutedH,
                      fontSize: keyChipMutedFs,
                      fontWeight: keyChipMutedFw,
                      flexShrink: 0,
                      bgcolor: mutedBg,
                      color: mutedColor,
                      "& .MuiChip-label": { px: 0.75 },
                    }}
                  />
                )}
              </Box>

              {isSelected && (
                <Box sx={{ color: "primary.main", display: "flex", flexShrink: 0 }}>
                  <CheckIcon />
                </Box>
              )}
            </MenuItem>
          );
        })}

        {/* ── Inline "Add new" field ──────────────────────────────────────── */}
        <Divider sx={{ my: 0.5 }} />

        <Box
          onClickCapture={(e) => e.stopPropagation()}
          sx={{ px: 1, pb: 1, pt: 0.5 }}
        >
          {/* Section label */}
          <Typography sx={{
            px: 0.25,
            pb: 0.6,
            fontSize: addLabelFs,
            fontWeight: addLabelFw,
            letterSpacing: addLabelLs,
            textTransform: "uppercase",
            color: "text.disabled",
          }}>
            Add new
          </Typography>

          {/* Input */}
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            placeholder="Type and press Enter…"
            value={newLabel}
            onChange={(e) => { setNewLabel(e.target.value); setAddError(""); }}
            onKeyDown={handleInputKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            error={!!addError}
            helperText={addError}
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box sx={{
                    display: "flex",
                    color: newLabel ? "primary.main" : "action.disabled",
                    transition: "color 150ms",
                  }}>
                    <PlusIcon />
                  </Box>
                </InputAdornment>
              ),
              endAdornment: newLabel.trim() && (
                <InputAdornment position="end">
                  <Box
                    onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    sx={{
                      px: addBtnPx,
                      py: addBtnPy,
                      borderRadius: addBtnBr,
                      fontSize: addBtnFs,
                      fontWeight: addBtnFw,
                      letterSpacing: addBtnLs,
                      color: "primary.contrastText",
                      bgcolor: "primary.main",
                      cursor: "pointer",
                      userSelect: "none",
                      transition: "background 150ms",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    ADD
                  </Box>
                </InputAdornment>
              ),
              sx: {
                fontSize: addInputFs,
                bgcolor: "action.hover",
                borderRadius: addInputBr,
                "& fieldset": { borderColor: "divider" },
                "&:hover fieldset": { borderColor: "action.disabled !important" },
                "&.Mui-focused fieldset": {
                  borderColor: "primary.main !important",
                  borderWidth: "1.5px !important",
                },
              },
            }}
            FormHelperTextProps={{ sx: { mx: 0.25, mt: 0.4, fontSize: "0.7rem" } }}
          />
        </Box>
      </Select>

      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}
