/**
 * BookingValidate.tsx
 *
 * Shows a running log of all validations.
 * "Show only changes" means: if the same QR code is scanned again
 * immediately (consecutive duplicate), the existing entry just gets
 * a re-scan counter bump instead of a new row — avoiding visual noise
 * when someone accidentally double-scans the same ticket.
 * Every genuinely different code always gets its own row.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import useNavigate from '@/hooks/useNavigate';
import { ticketApi } from '@/services/api';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/utils/misc';



export const BookingList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showDialog = useDialog();

  return (
    <>Work in progress...</>
  );

};

export default BookingList;