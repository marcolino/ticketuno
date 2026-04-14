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
  //content?: ReactNode | (() => ReactNode);
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

const DialogContext = createContext<ShowDialog | null>(null);

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

  // ── Resolve content to ReactNode ──────────────────────────────────────────
  //
  // fn.length is the number of declared parameters:
  //   0  →  () => ReactNode          (existing pattern, unchanged)
  //   1  →  (close) => ReactNode     (new pattern)
  //
  // Plain ReactNode (non-function) is passed through as-is.
  //
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
    <DialogContext.Provider value={showDialog}>
      {children}

      <Dialog
        open={!!options}
        onClose={handleCancel}
        maxWidth={options?.shrinkToContent ? false : "sm"}
        fullWidth={!options?.shrinkToContent}
        disableScrollLock
        PaperProps={
          options?.shrinkToContent
            ? { sx: { width: "auto", maxWidth: "90vw", ...options.paperSx } }
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
                      close(false); // custom buttons are neither confirm nor cancel
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
    </DialogContext.Provider>
  );
};

export const useDialog = (): ShowDialog => {
  const ctx = useContext(DialogContext);
  const { t } = useTranslation();
  if (!ctx) throw new Error(t('useDialog must be used inside DialogProvider'));
  return ctx;
};
