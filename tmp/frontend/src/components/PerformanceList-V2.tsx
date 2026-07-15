// PerformancesList.tsx
import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Button,
  Chip,
  CircularProgress,
  Typography,
  Box,
  Tooltip,
  IconButton
} from '@mui/material';
import { 
  Event as EventIcon,
  Info as InfoIcon,
  Cancel as CancelIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { EventPerformance } from '@ticketuno/shared';

interface PerformanceWithSeatCounts extends EventPerformance {
  seatCounts?: {
    total: number;
    available: number;
    booked: number;
    reserved: number;
  };
}

interface PerformancesListProps {
  performances: PerformanceWithSeatCounts[];
  onEdit?: (performance: EventPerformance) => void;
  onCancel?: (performanceId: string) => void;
  onViewDetails?: (performanceId: string) => void;
  loading?: boolean;
  showSeatCounts?: boolean;
}

const PerformancesList: React.FC<PerformancesListProps> = ({
  performances,
  onEdit,
  onCancel,
  onViewDetails,
  loading = false,
  showSeatCounts = true,
}) => {
  const [selectedPerformance, setSelectedPerformance] = useState<string | null>(null);

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM dd, yyyy');
    } catch {
      return date;
    }
  };

  const formatTime = (time: string) => {
    try {
      return format(new Date(`2000-01-01T${time}`), 'h:mm a');
    } catch {
      return time;
    }
  };

  const getSeatAvailabilityStatus = (available: number, total: number) => {
    const percentage = total > 0 ? (available / total) * 100 : 0;
    if (percentage === 0) return { label: 'Sold Out', color: 'error' as const };
    if (percentage < 20) return { label: 'Almost Sold Out', color: 'warning' as const };
    if (percentage < 50) return { label: 'Limited Availability', color: 'info' as const };
    return { label: 'Available', color: 'success' as const };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (!performances || performances.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1" color="textSecondary">
          No performances available
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="performances table">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Time</TableCell>
            {showSeatCounts && (
              <>
                <TableCell align="center">Total Seats</TableCell>
                <TableCell align="center">Available</TableCell>
                <TableCell align="center">Booked</TableCell>
                <TableCell align="center">Reserved</TableCell>
                <TableCell align="center">Status</TableCell>
              </>
            )}
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {performances.map((performance) => {
            const { total = 0, available = 0, booked = 0, reserved = 0 } = 
              performance.seatCounts || {};
            const availabilityStatus = getSeatAvailabilityStatus(available, total);
            const isSoldOut = available === 0 && total > 0;

            return (
              <TableRow 
                key={performance.id}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Box display="flex" alignItems="center" gap={1}>
                    <EventIcon fontSize="small" color="action" />
                    {formatDate(performance.performanceDate)}
                  </Box>
                </TableCell>
                <TableCell>{formatTime(performance.startTime)}</TableCell>
                
                {showSeatCounts && (
                  <>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight="bold">
                        {total}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                        <Typography 
                          variant="body2" 
                          color={available === 0 ? 'error' : 'success'}
                          fontWeight="bold"
                        >
                          {available}
                        </Typography>
                        {available === 0 && total > 0 && (
                          <Tooltip title="No seats available">
                            <CancelIcon fontSize="small" color="error" />
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body2" color="textSecondary">
                        {booked}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Typography variant="body2" color="textSecondary">
                        {reserved}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="center">
                      <Chip
                        label={isSoldOut ? 'Sold Out' : availabilityStatus.label}
                        color={isSoldOut ? 'error' : availabilityStatus.color}
                        size="small"
                        variant={isSoldOut ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                  </>
                )}
                
                <TableCell align="center">
                  <Box display="flex" justifyContent="center" gap={1}>
                    {onViewDetails && (
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => onViewDetails(performance.id)}
                          color="primary"
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onEdit && (
                      <Tooltip title="Edit Performance">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(performance)}
                          color="secondary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {onCancel && (
                      <Tooltip title="Cancel Performance">
                        <IconButton
                          size="small"
                          onClick={() => onCancel(performance.id)}
                          color="error"
                          disabled={booked > 0 || reserved > 0}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PerformancesList;
