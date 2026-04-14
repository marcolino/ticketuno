import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material/';

type DialogButton = {
  text: string;
  onClick: () => void | Promise<void>;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'inherit' | 'primary' | 'secondary' | 'error';
};

export type DialogOptions = {
  title: string;
  content?: ReactNode | (() => ReactNode) | ((close: () => void) => ReactNode);

  confirmText?: string;
  onConfirm?: () => void | Promise<void>;

  cancelText?: string;
  onCancel?: () => void;

  buttons?: DialogButton[];

  showCloseIcon?: boolean;
  shrinkToContent?: boolean;

  paperSx?: object;

  mode?: 'success' | 'info' | 'warning' | 'error';
};

export type ShowDialog = (options: DialogOptions) => Promise<boolean>;

// ── Two contexts: public API + internal rendering state ───────────────────────

const DialogAPIContext = createContext<ShowDialog | null>(null);

type DialogRenderState = {
  options: DialogOptions | null;
  handleConfirm: () => Promise<void>;
  handleCancel: () => void;
};
const DialogRenderContext = createContext<DialogRenderState | null>(null);

// ── DialogProvider — manages state only, renders no DOM ───────────────────────
//
// Place OUTSIDE AuthProvider so AuthProvider can call useDialog().
//
export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [resolver, setResolver] = useState<((confirmed: boolean) => void) | null>(null);

  const close = (confirmed: boolean) => {
    resolver?.(confirmed);
    setOptions(null);
    setResolver(null);
  };

  const showDialog: ShowDialog = (opts) =>
    new Promise<boolean>((resolve) => {
      setOptions(opts);
      setResolver(() => resolve);
    });

  const handleConfirm = async () => {
    await options?.onConfirm?.();
    close(true);
  };

  const handleCancel = () => {
    options?.onCancel?.();
    close(false);
  };

  return (
    <DialogAPIContext.Provider value={showDialog}>
      <DialogRenderContext.Provider value={{ options, handleConfirm, handleCancel }}>
        {children}
      </DialogRenderContext.Provider>
    </DialogAPIContext.Provider>
  );
};

// ── DialogRenderer — renders the MUI Dialog, place INSIDE AuthProvider ────────
//
// Lives inside AuthProvider (and any other providers), so dialog content
// components can freely call useAuth(), useToast(), etc.
//
export const DialogRenderer: React.FC = () => {
  const ctx = useContext(DialogRenderContext);
  const { t } = useTranslation();
  if (!ctx) throw new Error(t('DialogRenderer must be inside DialogProvider'));

  const { options, handleConfirm, handleCancel } = ctx;

  const resolveContent = (): ReactNode => {
    const c = options?.content;
    if (typeof c === 'function') {
      return c.length > 0
        ? (c as (close: () => void) => ReactNode)(handleCancel)
        : (c as () => ReactNode)();
    }
    return c;
  };

  return (
    <Dialog
      open={!!options}
      onClose={handleCancel}
      maxWidth={options?.shrinkToContent ? false : "sm"}
      fullWidth={!options?.shrinkToContent}
      disableScrollLock
      PaperProps={
        options?.shrinkToContent
          ? { sx: { width: "auto", maxWidth: "90vw", ...options?.paperSx } }
          : { sx: options?.paperSx }
      }
    >
      {options && (
        <>
          <DialogTitle
            sx={{
              backgroundColor: options.mode ? options.mode + ".main" : "primary.main",
              color: "primary.contrastText",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              pr: 1,
            }}
          >
            {options.title}

            {options.showCloseIcon && (
              <IconButton
                size="small"
                onClick={handleCancel}
                sx={{ color: "primary.contrastText", pl: 4 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </DialogTitle>

          {options.content && (
            <DialogContent sx={{ whiteSpace: "pre-line", mt: 3 }}>
              {resolveContent()}
            </DialogContent>
          )}

          {(options.confirmText || options.cancelText || options.buttons?.some(b => b.text)) && (
            <DialogActions sx={{ m: 2 }}>
              {options.cancelText && (
                <Button onClick={handleCancel}>
                  {options.cancelText}
                </Button>
              )}

              {options.buttons?.map((btn, i) => (
                <Button
                  key={i}
                  variant={btn.variant ?? "text"}
                  color={btn.color ?? "primary"}
                  onClick={async () => {
                    await btn.onClick();
                    handleCancel();
                  }}
                  sx={{ m: 2 }}
                >
                  {btn.text}
                </Button>
              ))}

              {options.confirmText && (
                <Button variant="contained" onClick={handleConfirm}>
                  {options.confirmText}
                </Button>
              )}
            </DialogActions>
          )}
        </>
      )}
    </Dialog>
  );
};

// ── useDialog — unchanged, all existing call sites work as-is ─────────────────

export const useDialog = (): ShowDialog => {
  const ctx = useContext(DialogAPIContext);
  const { t } = useTranslation();
  if (!ctx) throw new Error(t('useDialog must be used inside DialogProvider'));
  return ctx;
};
