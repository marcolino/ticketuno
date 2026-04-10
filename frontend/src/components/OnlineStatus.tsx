import { Badge, Tooltip } from '@mui/material';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const OnlineStatus = () => {
  const isOnline = useOnlineStatus();
  return (
    <Tooltip title={isOnline ? 'Online' : 'Offline'}>
      <Badge
        variant="dot"
        color={isOnline ? 'success' : 'error'}
        sx={{ '& .MuiBadge-dot': { width: 10, height: 10, borderRadius: '50%' } }}
      />
    </Tooltip>
  );
}

export default OnlineStatus;

// import { useOnlineStatus } from '@/hooks/useOnlineStatus';
// import { Chip } from '@mui/material';
// import { WifiOff, Wifi } from '@mui/icons-material';

// const OnlineStatusChip = () => {
//   const isOnline = useOnlineStatus();

//   return (
//     <Chip
//       icon={isOnline ? <Wifi /> : <WifiOff />}
//       label={isOnline ? 'Online' : 'Offline'}
//       color={isOnline ? 'success' : 'error'}
//       size="small"
//       variant="outlined"
//       sx={{padding: -5}}
//     />
//   );
// };

// export default OnlineStatusChip;
