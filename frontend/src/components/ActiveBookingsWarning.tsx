import { Table, TableBody, TableCell, TableHead, TableRow, Typography, Box } from '@mui/material';
import { ActiveBookingInfo } from '@/shared/types/guard';
import { useTranslation } from 'react-i18next';

type Props = {
  bookings: ActiveBookingInfo[];
  action?: string;
};

const ActiveBookingsWarning: React.FC<Props> = ({ bookings, action }) => {
  const { t } = useTranslation();

  // Raggruppa le prenotazioni per evento e teatro
  const groupedBookings = bookings.reduce<Record<string, ActiveBookingInfo[]>>((acc, booking) => {
    const key = `${booking.eventTitle}|${booking.theaterName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(booking);
    return acc;
  }, {});

  let actionDescription = '';
  switch (action) {
    case 'theater':
      actionDescription = t('Theater can\'t be deleted because\nit has events with performances\nwith active booked seats');
      break;
     case 'layout':
      actionDescription = t('Layout can\'t be deleted because\nit is linked to theaters which has events\nwith performances with active booked seats');
      break;
     case 'event':
      actionDescription = t('Event can\'t be deleted because\nit has performances\nwith active booked seats');
      break;
     case 'performance':
      actionDescription = t('Performance can\'t be deleted because\nit has active booked seats');
      break;
    case 'user':
      actionDescription = t('User can\'t be deleted because\nshe has active booked seats');
      break;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ backgroundColor: "error" }} fontWeight={600} gutterBottom>
        {actionDescription ?? t('This action can\'t be performed, it would disrupt active bookings')}
      </Typography>
      <Typography variant="body1" gutterBottom>
        {t('The following confirmed bookings are affected:')}
      </Typography>
      <Box sx={{ maxHeight: '40vh', overflowY: 'auto', mt: 1 }}>
        {Object.entries(groupedBookings).map(([key, groupBookings]) => {
          const firstBooking = groupBookings[0];
          const eventTitle = firstBooking.eventTitle;
          const theaterName = firstBooking.theaterName;

          return (
            <Box key={key} sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
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
