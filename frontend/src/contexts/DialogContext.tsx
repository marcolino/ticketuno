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
import {
  Close as CloseIcon,
  //Cancel as CancelIcon,
} from '@mui/icons-material/';

type DialogButton = {
  text: string;
  onClick: () => void | Promise<void>;
  variant?: "text" | "outlined" | "contained";
  color?: "inherit" | "primary" | "secondary" | "error";
};

type DialogOptions = {
  title: string;
  content?: ReactNode | (() => ReactNode); // Allow either a ReactNode or a function that returns one

  confirmText?: string;
  onConfirm?: () => void | Promise<void>;

  cancelText?: string;
  onCancel?: () => void;

  buttons?: DialogButton[];

  showCloseIcon?: boolean;
  shrinkToContent?: boolean;
};

type ShowDialog = (options: DialogOptions) => Promise<void>;

const DialogContext = createContext<ShowDialog | null>(null);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [options, setOptions] = useState<DialogOptions | null>(
    null
  );
  const [resolver, setResolver] =
    useState<(() => void) | null>(null);

  const close = () => {
    resolver?.();
    setOptions(null);
    setResolver(null);
  };

  const showDialog: ShowDialog = (opts) =>
    new Promise<void>((resolve) => {
      setOptions(opts);
      setResolver(() => resolve);
    });

  const handleConfirm = async () => {
    await options?.onConfirm?.();
    close();
  };

  const handleCancel = () => {
    options?.onCancel?.();
    close();
  };

  return (
    <DialogContext.Provider value={showDialog}>
      {children}

      <Dialog
        open={!!options}
        onClose={handleCancel}
        maxWidth={options?.shrinkToContent ? false : "sm"}
        fullWidth={!options?.shrinkToContent}
        disableScrollLock // TODO: ok?
        PaperProps={
          options?.shrinkToContent
            ? {
                sx: {
                  width: "auto",
                  maxWidth: "90vw",
                },
              }
            : undefined
        }
      >
        {options && (
          <>
            <DialogTitle
              sx={{
                backgroundColor: "primary.main",
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
                  sx={{
                    color: "primary.contrastText",
                    pl: 4,
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </DialogTitle>

            {options.content && (
              <DialogContent
                sx={{
                  whiteSpace: "pre-line",
                  mt: 3,
                }}
              >
                {typeof options?.content === "function"
                  ? options.content()
                  : options.content
                }
              </DialogContent>
            )}

            {(options.confirmText || options.cancelText || options.buttons?.some(opt => opt.text)) && (
              <DialogActions>
                {/* Cancel */}
                {options.cancelText && (
                  <Button onClick={handleCancel}>
                    
                    {options.cancelText}
                  </Button>
                )}

                {/* Custom buttons */}
                {options.buttons?.map((btn, i) => (
                  <Button
                    key={i}
                    variant={btn.variant ?? "text"}
                    color={btn.color ?? "primary"}
                    onClick={async () => {
                      await btn.onClick();
                      close();
                    }}
                  >
                    {btn.text}
                  </Button>
                ))}

                {/* Confirm */}
                {options.confirmText && (
                  <Button
                    variant="contained"
                    onClick={handleConfirm}
                  >
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
  if (!ctx) {
    throw new Error(
      t("useDialog must be used inside DialogProvider")
    );
  }
  return ctx;
};
