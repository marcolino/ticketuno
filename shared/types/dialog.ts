import { ReactNode } from 'react'
import { DialogProps, ButtonProps } from '@mui/material'

export type DialogVariant = 'confirm' | 'alert' | 'custom'

export interface DialogOptions {
  title?: ReactNode
  content?: ReactNode

  confirmText?: string
  cancelText?: string

  onConfirm?: () => void | Promise<void>
  onCancel?: () => void

  variant?: DialogVariant

  maxWidth?: DialogProps['maxWidth']
  fullWidth?: DialogProps['fullWidth']

  shrinkToContent: boolean
  
  confirmColor?: ButtonProps['color']

  disableBackdropClick?: boolean
  disableEscapeKeyDown?: boolean

  dialogProps?: Partial<DialogProps>

  renderContent?: (close: () => void) => ReactNode
}

export interface DialogState extends DialogOptions {
  isOpen: boolean
}
