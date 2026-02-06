import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";

export type DialogButton = {
  text: string;
  onClick: () => void | Promise<void>;
  variant?: "text" | "outlined" | "contained";
  color?: "inherit" | "primary" | "secondary" | "error";
};

export type DialogOptions = {
  title: string;
  content?: ReactNode;

  confirmText?: string;
  onConfirm?: () => void | Promise<void>;

  cancelText?: string;
  onCancel?: () => void;

  buttons?: DialogButton[];
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
        maxWidth="sm"
        fullWidth
      >
        {options && (
          <>
            <DialogTitle
              sx={{
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 600,
              }}
            >
              {options.title}
            </DialogTitle>

            {options.content && (
              <DialogContent
                sx={{
                  whiteSpace: "pre-line",
                  my: 3,
                }}
              >
                {options.content}
              </DialogContent>
            )}

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
          </>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
};

export const useDialog = (): ShowDialog => {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error(
      "useDialog must be used inside DialogProvider"
    );
  }
  return ctx;
};
