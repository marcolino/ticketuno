import { Table, TableBody, TableCell, TableHead, TableRow, Typography, Box } from '@mui/material';
import { ActiveBookingInfo } from '@/shared/types/guard';
import { useTranslation } from 'react-i18next';

type Props = {
  bookings: ActiveBookingInfo[];
  actionDescription?: string;
};

const ActiveBookingsWarning: React.FC<Props> = ({ bookings, actionDescription }) => {
  const { t } = useTranslation();

  // Raggruppa le prenotazioni per evento e teatro
  const groupedBookings = bookings.reduce<Record<string, ActiveBookingInfo[]>>((acc, booking) => {
    const key = `${booking.eventTitle}|${booking.theaterName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(booking);
    return acc;
  }, {});

  return (
    <Box>
      <Typography variant="h5" color="error" fontWeight={600} gutterBottom>
        {actionDescription ?? t('This action can\'t be performed, it would disrupt active bookings.')}
      </Typography>
      <Typography variant="h6" gutterBottom>
        {t('The following confirmed bookings are affected:')}
      </Typography>
      <Box sx={{ maxHeight: '40vh', overflowY: 'auto', mt: 1 }}>
        {Object.entries(groupedBookings).map(([key, groupBookings]) => {
          const firstBooking = groupBookings[0];
          const eventTitle = firstBooking.eventTitle;
          const theaterName = firstBooking.theaterName;

          return (
            <Box key={key} sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                {t('Event: {{eventTitle}}, Theater: {{theaterName}}', {
                  eventTitle,
                  theaterName,
                })}
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>{t('Reference')}</TableCell>
                    <TableCell>{t('User')}</TableCell>
                    <TableCell>{t('Email')}</TableCell>
                    <TableCell>{t('Performance')}</TableCell>
                    {/* <TableCell align="center">{t('Seats')}</TableCell> */}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {groupBookings.map(b => (
                    <TableRow key={b.bookingId}>
                      <TableCell>{b.bookingRef}</TableCell>
                      <TableCell>
                        {b.userFirstName} {b.userLastName}
                      </TableCell>
                      <TableCell>{b.userEmail}</TableCell>
                      <TableCell>
                        {b.performanceDate} {b.startTime}
                      </TableCell>
                      {/* <TableCell align="center">{b.seatIds.length}</TableCell> */}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default ActiveBookingsWarning;
