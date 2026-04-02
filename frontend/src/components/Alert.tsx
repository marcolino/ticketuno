import React from 'react';
import {
  Alert as MuiAlert,
  AlertProps as MuiAlertProps,
  AlertTitle,
  Collapse,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export interface AlertProps extends MuiAlertProps {
  dismissible?: boolean;
  title?: string;
  autoHideDuration?: number;
  onClose?: () => void;
  /** If true, the alert spans the full width of its container (default: false) */
  fullWidth?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      children,
      severity = 'info',
      variant = 'filled',
      dismissible = false,
      title,
      autoHideDuration,
      onClose,
      fullWidth = false,
      sx,
      ...rest
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(true);

    const handleClose = () => {
      setOpen(false);
      onClose?.();
    };

    React.useEffect(() => {
      if (autoHideDuration && open) {
        const timer = setTimeout(handleClose, autoHideDuration);
        return () => clearTimeout(timer);
      }
    }, [autoHideDuration, open]);

    const alertContent = (
      <MuiAlert
        ref={ref}
        severity={severity}
        variant={variant}
        action={
          dismissible && !rest.action ? (
            <IconButton aria-label="close" color="inherit" size="small" onClick={handleClose}>
              <CloseIcon fontSize="inherit" />
            </IconButton>
          ) : (
            rest.action
          )
        }
        sx={{
          // Default: width fits content, with a max width to avoid overflow on small screens
          ...(!fullWidth && {
            width: 'fit-content',
            maxWidth: '100%',
            fontSize: '1rem',
            mb: 2,
          }),
          ...sx,
        }}
        {...rest}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {children}
      </MuiAlert>
    );

    if (autoHideDuration || dismissible) {
      return <Collapse in={open}>{alertContent}</Collapse>;
    }
    return alertContent;
  }
);

Alert.displayName = 'Alert';
export default Alert;
