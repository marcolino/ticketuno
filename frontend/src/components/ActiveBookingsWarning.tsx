import { Table, TableBody, TableCell, TableHead, TableRow, Typography, Box } from '@mui/material';
import { ActiveBookingInfo } from '@ticketuno/shared';
import { useTranslation } from 'react-i18next';

type ActiveBookingsWarningProps = {
  bookings: ActiveBookingInfo[];
  action?: string;
  verb?: 'delete' | 'edit' | 'edit theater association';
};

const ActiveBookingsWarning: React.FC<ActiveBookingsWarningProps> = ({ 
  bookings, 
  action, 
  verb = 'delete'
}) => {
  const { t } = useTranslation();

  // Raggruppa le prenotazioni per evento e teatro
  const groupedBookings = bookings.reduce<Record<string, ActiveBookingInfo[]>>((acc, booking) => {
    const key = `${booking.eventTitle}|${booking.theaterName}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(booking);
    return acc;
  }, {});

  let actionDescription;
  switch (action) {
    case 'theater':
      actionDescription = t('Can\'t {{verb}} {{action}} because\nit has events with performances\nwith active booked seats', { verb, action });
      break;
     case 'layout':
      actionDescription = t('Can\'t {{verb}} {{action}} because\nit is linked to theaters which have events\nwith performances with active booked seats', { verb, action });
      break;
     case 'event':
      actionDescription = t('Can\'t {{verb}} {{action}} because\nit has performances\nwith active booked seats', { verb, action });
      break;
     case 'performance':
      actionDescription = t('Can\'t {{verb}} {{action}} because\nit has active booked seats', { verb, action });
      break;
    case 'user':
      actionDescription = t('Can\'t {{verb}} {{action}} because\nshe has active booked seats', { verb, action });
      break;
    default:
      actionDescription = t('This action can\'t be performed, it would disrupt active bookings');
      break;
  }

  return (
    <Box>
      {/* <Typography variant="h6" sx={{ backgroundColor: "red", lineHeight: 1.2, padding: 1, borderRadius: 1.5 }} color={"white"} fontWeight={600} gutterBottom> */}
      <Typography
        variant="h6"
        sx={(/*theme*/) => ({
          //backgroundColor: theme.palette.error.main, // uses theme's error color
          //color: theme.palette.error.contrastText, // ensures readable text
          lineHeight: 1.2,
          padding: 1,
          borderRadius: '8px', // ensures a little roundness of border, ignoring themes shape.borderRadius differences
          fontWeight: 600,
        })}
        gutterBottom
      >
        {actionDescription}
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
