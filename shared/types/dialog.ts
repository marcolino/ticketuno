import { ReactNode } from 'react';
import { ButtonProps } from '@mui/material';

export type DialogVariant = 'confirm' | 'alert' | 'custom';

export interface DialogOptions {
  /** Dialog title */
  title?: string;
  /** Dialog content - can be string or ReactNode */
  content?: string | ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirm is clicked */
  onConfirm?: () => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Dialog variant type */
  variant?: DialogVariant;
  /** MUI Dialog maxWidth prop */
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  /** Whether dialog takes full width */
  fullWidth?: boolean;
  /** Confirm button color */
  confirmColor?: ButtonProps['color'];
  /** Whether dialog can be closed by clicking backdrop */
  disableBackdropClick?: boolean;
  /** Whether dialog can be closed with Escape key */
  disableEscapeKeyDown?: boolean;
  /** Additional props for the Dialog component */
  dialogProps?: Record<string, any>;
  /** Custom render function for dialog content */
  renderContent?: (handleClose: () => void) => ReactNode;
}

export interface DialogState extends DialogOptions {
  isOpen: boolean;
}
