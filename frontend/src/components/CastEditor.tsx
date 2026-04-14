import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  Box,
  InputBase,
  Typography,
} from '@mui/material';

/**
 * NameInput - a plain bordered text input built on MUI's unstyled InputBase.
 */
function NameInput({ value, onChange, onKeyDown, placeholder, error, inputRef }: {
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  placeholder?: string;
  error?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const { shape } = useTheme();
  return (
    <InputBase
      inputRef={inputRef}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      sx={{
        flex: 1,
        minWidth: 0,
        px: 1.5,
        py: 0.75,
        border: "1.5px solid",
        borderColor: error ? "error.main" : "divider",
        borderRadius: `${shape.borderRadius ?? 8}px`,
        fontSize: "0.9rem",
        bgcolor: "background.paper",
        transition: "border-color 150ms",
        "&.Mui-focused": { borderColor: "primary.main" },
        "& input::placeholder": { color: "text.disabled", opacity: 1 },
        "& input": { p: 0, lineHeight: "1.4" },
      }}
    />
  );
}

/**
 * ActionButton — a native <button> styled via Box sx.
 * variant: "primary" | "ghost"
 */
function ActionButton({ onClick, children, variant = "primary", disabled = false, sx = {} }) {
  const { shape } = useTheme();
  const isPrimary = variant === "primary";
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        py: 0.875,
        border: "none",
        borderRadius: `${shape.borderRadius ?? 8}px`,
        fontSize: "0.82rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        fontFamily: "inherit",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        whiteSpace: "nowrap",
        transition: "background 150ms, opacity 150ms",
        bgcolor: isPrimary ? "primary.main" : "transparent",
        color: isPrimary ? "primary.contrastText" : "text.secondary",
        "&:hover:not(:disabled)": {
          bgcolor: isPrimary ? "primary.dark" : "action.hover",
        },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/**
 * RoleTag — a small tinted badge displaying the role name.
 * Uses primary color with alpha so it adapts to any theme.
 */
function RoleTag({ label }) {
  const { palette } = useTheme();
  const primary = palette.primary.main;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        py: 0.25,
        borderRadius: "5px",
        fontSize: "0.72rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
        flexShrink: 0,
        bgcolor: `${primary}1A`,           // primary @ ~10%
        color: "primary.main",
        border: `1px solid ${primary}33`,  // primary @ ~20%
      }}
    >
      {label}
    </Box>
  );
}

/** XIcon — inline so there's no icon-library dependency */
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/** PencilIcon — inline, used for the inline-edit trigger */
const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

/**
 * RemoveButton — a small circular icon-button.
 * Uses error color on hover via inline calculation (no Chip, no IconButton).
 */
function RemoveButton({ onClick, label }) {
  const { palette } = useTheme();
  const errorColor = palette.error?.main ?? "#EF4444";
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={label ?? "Remove"}
      sx={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 24, height: 24, p: 0,
        border: "none", borderRadius: "50%",
        bgcolor: "transparent",
        color: "text.disabled",
        cursor: "pointer",
        flexShrink: 0,
        fontFamily: "inherit",
        transition: "color 150ms, background 150ms",
        "&:hover": {
          color: errorColor,
          bgcolor: `${errorColor}14`,     // error @ ~8%
        },
      }}
    >
      <XIcon />
    </Box>
  );
}

/**
 * EditButton — a small circular icon-button for triggering inline name edit.
 * Uses primary color on hover, mirroring RemoveButton's style.
 */
function EditButton({ onClick, label }) {
  const { palette } = useTheme();
  const primaryColor = palette.primary.main;
  return (
    <Box
      component="button"
      onClick={onClick}
      aria-label={label ?? "Edit"}
      sx={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 24, height: 24, p: 0,
        border: "none", borderRadius: "50%",
        bgcolor: "transparent",
        color: "text.disabled",
        cursor: "pointer",
        flexShrink: 0,
        fontFamily: "inherit",
        transition: "color 150ms, background 150ms",
        "&:hover": {
          color: primaryColor,
          bgcolor: `${primaryColor}14`,   // primary @ ~8%
        },
      }}
    >
      <PencilIcon />
    </Box>
  );
}

/**
 * CastRow — one cast entry: role badge + name + remove button.
 * Entirely custom — no MUI ListItem, no MUI Chip.
 *
 * When `onRename` is provided, the actor name is editable inline:
 * click the pencil icon to enter edit mode, confirm with Enter or blur,
 * cancel with Escape. The role is not editable from this row.
 */
function CastRow({ role, name, onRemove, onRename }: {
  role: string;
  name: string;
  onRemove: () => void;
  onRename?: (newName: string) => void;
}) {
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState(name);

  const startEdit = () => {
    setDraft(name);
    setEditing(true);
  };

  const confirmEdit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) {
      onRename?.(trimmed);
    } else {
      // restore draft to committed name if empty or unchanged
      setDraft(name);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(name);
    setEditing(false);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); confirmEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit();  }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 0.875,
        borderRadius: 1.5,
        border: "1px solid",
        borderColor: editing ? "primary.main" : "divider",
        bgcolor: "background.paper",
        transition: "border-color 150ms, background 150ms",
        "&:hover": { borderColor: editing ? "primary.main" : "primary.light", bgcolor: "action.hover" },
      }}
    >
      <RoleTag label={role} />

      {editing ? (
        <NameInput
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={(el) => el?.focus()}
          // confirm on blur so clicking away outside also saves
          // (wrapped in setTimeout to let Escape's cancelEdit fire first)
          {...{ onBlur: () => setTimeout(confirmEdit, 120) }}
        />
      ) : (
        <Typography
          sx={{
            flex: 1,
            fontSize: "0.9rem",
            fontWeight: 500,
            color: "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </Typography>
      )}

      {/* Edit button — only shown when onRename is provided and not already editing */}
      {onRename && !editing && (
        <EditButton onClick={startEdit} label={`Edit ${name}`} />
      )}

      <RemoveButton onClick={onRemove} label={`Remove ${name}`} />
    </Box>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PRESET ROLES
// ══════════════════════════════════════════════════════════════════════════════
const DEFAULT_ROLES = [
];
  // { key: t('protagonista'), value: ''}
  // { key: 'director',   value: 'Director' },
  // { key: 'lead',       value: 'Lead Actor' },
  // { key: 'supporting', value: 'Supporting Actor' },
  // { key: 'understudy', value: 'Understudy' },
  // { key: 'crew',       value: 'Stage Crew' },

// ══════════════════════════════════════════════════════════════════════════════
//  CAST EDITOR
// ══════════════════════════════════════════════════════════════════════════════
/**
 * CastEditor
 *
 * Composes SelectWithAdd (role picker) + NameInput + ActionButton
 * into a list manager for theater cast entries.
 *
 * Props:
 *   value       {{ role: string, name: string }[]}   Controlled cast array
 *   onChange    {(cast) => void}                     Called on every change
 *   roleOptions {{ key, value }[]}                   Preset roles for the picker
 *   label       {string}                             Section label
 */

export type CastEntry = { role: string; name: string };

export function CastEditor({
  value: controlledCast,
  onChange,
  roleOptions = DEFAULT_ROLES,
  label = '', // 'Cast',
}) {
  const [internalCast, setInternalCast] = useState([]);
  const [role, setRole]   = useState('');
  const [name, setName]   = useState('');
  const [error, setError] = useState('');

  const cast = controlledCast ?? internalCast;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  console.log("ISMOBILE:", isMobile);

  const { t } = useTranslation();
  
  const commit = (next) => {
    setInternalCast(next);
    onChange?.(next);
  };

  const handleAdd = () => {
    if (!role) { setError('Select a role first.'); return; }
    if (!name.trim()) { setError('Enter the actor\'s name.'); return; }
    commit([...cast, { role, name: name.trim() }]);
    setName('');
    // Keep the role — it's common to add multiple actors in the same role
    setError('');
  };

  const handleRemove = (i) => commit(cast.filter((_, idx) => idx !== i));

  const handleRename = (i, newName) =>
    commit(cast.map((entry, idx) => (idx === i ? { ...entry, name: newName } : entry)));

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>

      {/* Section label */}
      {label && (
        <Typography sx={{
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "text.disabled",
        }}>
          {label}
        </Typography>
      )}

      {/* Cast list */}
      {cast.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.625 }}>
          {cast.map((entry, i) => (
            <CastRow
              key={i}
              role={entry.role}
              name={entry.name}
              onRemove={() => handleRemove(i)}
              onRename={(newName) => handleRename(i, newName)}
            />
          ))}
        </Box>
      )}

      {cast.length === 0 && (
        <Box sx={{
          px: 2, py: 1.5,
          borderRadius: 1.5,
          border: "1px dashed",
          borderColor: "divider",
          textAlign: "center",
        }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.disabled", fontStyle: "italic" }}>
            {t('no cast members yet')}
          </Typography>
        </Box>
      )}

      {/* Add form: role + name + button */}
      {/* <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}> */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "center",
          //flexDirection: isMobile ? "column" : "row",
        }}
      >
        {/*
          SelectWithAdd handles the role field.
          It knows nothing about cast — it's just a value picker.
          New roles typed here (key === value) are silently accepted.
        */}
        <SelectWithAddStub
          options={roleOptions}
          value={role}
          onChange={(key) => { setRole(key); setError(''); }}
          placeholder={t('Role') + '…'}
          error={!!error && !role}
        />

        <NameInput
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder={t('Actor name') + '…'}
          error={!!error && !name.trim()}
        />

        <ActionButton
          onClick={handleAdd}
          disabled={false}
          //sx={isMobile ? { width: "100%" } : undefined}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <PlusIcon /> {!isMobile && t('Add')}
          </Box>
        </ActionButton>
      </Box>

      {/* Inline error */}
      {error && (
        <Typography sx={{ fontSize: "0.75rem", color: "error.main", lineHeight: 1 }}>
          {error}
        </Typography>
      )}

    </Box>
  );
}


type Option = { key: string; value: string };

/**
 * SelectWithAddStub - Minimal inline re-implementation of SelectWithAdd.
 */
function SelectWithAddStub({ options: init = [], value, onChange, placeholder, error }:  {
  options?: Option[];
  value: string;
  onChange?: (key: string) => void;
  placeholder?: string;
  error?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [options, setOptions] = useState(init);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [addErr, setAddErr] = useState('');
  const primary = theme.palette.primary.main;
  const radius  = theme.shape.borderRadius ?? 8;

  const selected = options.find((o) => o.key === value);

  const pick = (key) => { onChange?.(key); setOpen(false); };

  const addNew = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setAddErr(t('Cannot be empty'));
      return;
    }
    if (options.some((o) => o.value.toLowerCase() === trimmed.toLowerCase())) {
      setAddErr(t('Already exists'));
      return;
    }
    const opt = { key: trimmed, value: trimmed };
    setOptions((p) => [...p, opt]);
    onChange?.(trimmed);
    setDraft(''); setAddErr(''); setOpen(false);
  };

  return (
    // <Box sx={{ position: "relative", flexShrink: 0, width: 148 }}>
    <Box sx={{ position: "relative", flex: 1, minWidth: 0 }}>
      {/* Trigger */}
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 1.5, py: 0.75,
          border: "1.5px solid",
          borderColor: error ? "error.main" : open ? "primary.main" : "divider",
          borderRadius: `${radius}px`,
          bgcolor: "background.paper",
          cursor: "pointer",
          userSelect: "none",
          fontSize: "0.9rem",
          transition: "border-color 150ms",
          minWidth: 0,
        }}
      >
        <Typography sx={{
          fontSize: "0.88rem",
          color: selected ? "text.primary" : "text.disabled",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          flex: 1,
        }}>
          {selected?.value ?? placeholder ?? t('Select') + '…'}
        </Typography>
        <Box sx={{ ml: 0.5, color: "text.disabled", display: "flex", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </Box>
      </Box>

      {/* Dropdown */}
      {open && (
        <Box
          sx={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            zIndex: 1400,
            bgcolor: "background.paper",
            border: "1px solid", borderColor: "divider",
            borderRadius: `${radius}px`,
            boxShadow: "0 8px 30px rgba(0,0,0,0.10)",
            overflow: "hidden",
            minWidth: 200, // to leave space for placeholders ("New role...", ...)
          }}
        >
          {/* Options */}
          <Box sx={{ maxHeight: 180, overflowY: "auto", py: 0.5 }}>
            {options.map((o) => (
              <Box
                key={o.key}
                onClick={() => pick(o.key)}
                sx={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  px: 1.5, py: 0.75, mx: 0.5, borderRadius: 1,
                  cursor: "pointer", fontSize: "0.88rem",
                  fontWeight: o.key === value ? 600 : 400,
                  color: o.key === value ? "primary.main" : "text.primary",
                  bgcolor: o.key === value ? `${primary}12` : "transparent",
                  "&:hover": { bgcolor: o.key === value ? `${primary}1C` : "action.hover" },
                  transition: "background 120ms",
                }}
              >
                {o.value}
                {o.key === value && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </Box>
            ))}
          </Box>

          {/* Add new */}
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", p: 1 }}>
            <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.07em",
              textTransform: "uppercase", color: "text.disabled", mb: 0.5 }}>
              {t('Add new role')}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              <InputBase
                value={draft}
                onChange={(e) => { setDraft(e.target.value); setAddErr(''); }}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') addNew(); }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder={t('Role') + '…'}
                sx={{
                  flex: 1, px: 1, py: 0.5, fontSize: "0.83rem",
                  border: "1px solid", borderColor: addErr ? "error.main" : "divider",
                  borderRadius: `${radius - 2}px`, bgcolor: "action.hover",
                  "& input": { p: 0 },
                  "&.Mui-focused": { borderColor: "primary.main" },
                }}
              />
              <ActionButton onClick={addNew}>{t('Add')}</ActionButton>
            </Box>
            {addErr && (
              <Typography sx={{ fontSize: "0.7rem", color: "error.main", mt: 0.4 }}>
                {addErr}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Click-away */}
      {open && (
        <Box
          onClick={() => setOpen(false)}
          sx={{ position: "fixed", inset: 0, zIndex: 1399 }}
        />
      )}
    </Box>
  );
}
