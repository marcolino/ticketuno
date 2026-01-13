import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Box,
  Alert,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { theaterApi } from '../services/api';
import { TheaterStats } from '../types/theater';

const TheaterList: React.FC = () => {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  //const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [theaters, setTheaters] = useState<TheaterStats[] | null>(null); // ← null = not loaded
  //const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTheaters();
  }, []);

  const loadTheaters = async () => {
    try {
      // setLoading(true);
      const response = await theaterApi.getAllTheaters();
      setTheaters(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load theaters');
      console.error(err);
    } finally {
      // setLoading(false);
    }
  };

  const handleViewTheater = (id: string) => {
    navigate(`/theater/${id}`);
  };

    const handleEditTheater = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/theater/edit/${id}`);
  };
  //const theme = useTheme();
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>

      {/* <div>
        <Typography variant="h4" sx={{ mb: 2 }}>
          Font Test - Should be Open Sans
        </Typography>
        <Typography sx={{ fontFamily: 'Open Sans, sans-serif' }}>
          Direct CSS: Open Sans
        </Typography>
        <Typography sx={{ fontFamily: theme.typography.fontFamily }}>
          Theme font: {theme.typography.fontFamily}
        </Typography>
      </div> */}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">
          {t('Available Theaters')}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/theater/new')}
        >
          Add Theater
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : theaters.length === 0 ? (
        <Alert severity="info">{t('No theaters available')}</Alert>
      ) : ( */}
        <Grid container spacing={3}>
          {theaters && theaters.map((theater) => (
            <Grid item xs={12} sm={6} md={4} key={theater.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {theater.name}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Total Seats')}: {theater.totalSeats}
                    </Typography>
                    <Typography
                      variant="body2"
                      color={theater.freeSeats > 0 ? 'success.main' : 'error.main'}
                    >
                      {t('Free Seats')}: {theater.freeSeats}
                    </Typography>
                  </Box>
                </CardContent>
                <Box sx={{ p: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleViewTheater(theater.id)}
                    disabled={theater.freeSeats === 0}
                  >
                    {t('View Seats')}
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={(e) => handleEditTheater(theater.id, e)}
                      sx={{ ml: 1 }}
                    >
                      Edit
                    </Button>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      {/* )} */}
    </Container>
  );
};

export default TheaterList;
