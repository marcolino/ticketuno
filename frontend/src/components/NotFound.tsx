import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import useNavigate from '@/hooks/useNavigate';
import HomeIcon from '@mui/icons-material/Home';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Container maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          mt: 8,
          p: 6,
          borderRadius: 2,
          textAlign: 'center',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        {/* <Typography
          variant="h1"
          sx={{
            fontSize: '6rem',
            fontWeight: 900,
            color: theme.palette.mode === 'light' 
              ? theme.palette.grey[300] 
              : theme.palette.grey[700],
            mb: 2,
          }}
        >
          404
        </Typography> */}
        
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          {t('Oops! Page not found')}
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          {t('Sorry, we can\'t find the page you are looking for.')}
        </Typography>
        
        <Box
          component="img"
          src="/images/404.png"
          alt="404"
          sx={{
            display: 'block',
            width: '100%',
            maxWidth: 300,
            height: 'auto',
            mb: 4,
            mx: 'auto',
            opacity: 0.8,
          }}
          // onError={(e) => {
          //   // If image doesn't exist, hide it
          //   e.currentTarget.style.display = 'none';
          // }}
        />
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            to="/"
            variant="contained"
            size="large"
            startIcon={<HomeIcon />}
            sx={{ minWidth: 180 }}
          >
            {t('Go Home')}
          </Button>
          {/* <Button
            component={RouterLink}
            to="/events"
            variant="outlined"
            size="large"
          >
            Browse Events
          </Button> */}
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ minWidth: 180 }}
          >
            {t('Go Back')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default NotFound;
