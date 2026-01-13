import { useLoading } from '../contexts/LoadingContext';
import { Backdrop, CircularProgress, Box } from '@mui/material';

export const LoadingSpinner = () => {
  const { isLoading } = useLoading();
  
  if (!isLoading) return null;
  
  return (
    <Backdrop
      open={true}
      sx={{
        zIndex: 9999,
        color: 'lightgreen',
        backgroundColor: 'transparent', //'rgba(0, 0, 0, 0.3)',
        //flexDirection: 'column',
      }}
    >
      <CircularProgress color="inherit" size={80} thickness={6} />
      {/* <Box sx={{ mt: 3 }}>
        Processing your request...
      </Box> */}
    </Backdrop>
  );
};
