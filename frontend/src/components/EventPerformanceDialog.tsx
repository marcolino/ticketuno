import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  Grid,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { t } from 'i18next';
import { eventApi } from '../services/api';
import { Event } from '../../../shared/types/event';

interface EventPerformanceDialogProps {
  open: boolean;
  onClose: () => void;
  event: Event;
  onSuccess?: () => void;
}

const EventPerformanceDialog: React.FC<EventPerformanceDialogProps> = ({
  open,
  onClose,
  event,
  onSuccess,
}) => {
  const [date, setDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      const now = new Date();
      setDate(now);
      setStartTime(new Date(now.setHours(19, 0, 0, 0))); // Default to 7:00 PM
      setEndTime(new Date(now.setHours(21, 0, 0, 0))); // Default to 9:00 PM
      setError(null);
    }
  }, [open]);

  const formatTime = (date: Date | null): string => {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleSubmit = async () => {
    if (!date || !startTime) {
      setError(t('Please select date and start time'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const performanceDate = date.toISOString().split('T')[0];
      const startTimeStr = formatTime(startTime);
      const endTimeStr = endTime ? formatTime(endTime) : undefined;

      await eventApi.createPerformance(event.id, {
        eventId: event.id,
        performanceDate,
        startTime: startTimeStr,
        endTime: endTimeStr,
        availableSeats: event.maxCapacity || 100,
        bookedSeats: 0,
        seatData: '{}',
        status: 'scheduled',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to create performance'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('Add New Performance')}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <DatePicker
                  label={t('Performance Date')}
                  value={date}
                  onChange={setDate as any}
                  minDate={new Date()}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label={t('Start Time')}
                  value={startTime}
                  onChange={setStartTime as any}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TimePicker
                  label={t('End Time (Optional)')}
                  value={endTime}
                  onChange={setEndTime as any}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('Available Seats')}
                  type="number"
                  value={event.maxCapacity || 100}
                  InputProps={{ readOnly: true }}
                  helperText={t('Based on event capacity')}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('Cancel')}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? t('Creating...') : t('Create Performance')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EventPerformanceDialog;