import { useState, useEffect } from 'react';
import { Tooltip, Box } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';
import WifiOffIcon from '@mui/icons-material/WifiOff';

interface OnlineStatusProps {
  isOnline?: boolean; // If we get it as prop, otherwise manage internally
}

const OnlineStatus = ({ isOnline: propIsOnline }: OnlineStatusProps) => {
  const [internalIsOnline, setInternalIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Use prop if provided, otherwise internal state
  const isOnline = propIsOnline !== undefined ? propIsOnline : internalIsOnline;

  useEffect(() => {
    // Only listen to online/offline events if prop is NOT provided
    if (propIsOnline !== undefined) return;

    const handleOnline = () => setInternalIsOnline(true);
    const handleOffline = () => setInternalIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [propIsOnline]);

  return (
    <Tooltip title={isOnline ? 'Online' : 'Offline'}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          verticalAlign: 'middle', // fallback for older browsers
          mb: 0.2
        }}
      >
        {isOnline ? (
          <WifiIcon fontSize="small" sx={{ color: 'success.main' }} />
        ) : (
          <WifiOffIcon fontSize="small" sx={{ color: 'error.main' }} />
        )}
      </Box>
    </Tooltip>
  );
}

export default OnlineStatus;
