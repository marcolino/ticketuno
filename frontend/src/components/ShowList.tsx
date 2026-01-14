import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Box,
  //CircularProgress,
  Alert,
  Chip,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  TheaterComedy as TheaterIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { showApi } from '../services/api';
import { ShowStats } from '../types/show';
import { useAuth } from '../contexts/AuthContext';

const ShowList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [shows, setShows] = useState<ShowStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    try {
      const response = await showApi.getAllShows();
      setShows(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load shows');
      console.error(err);
    } finally {
    }
  };

  const handleViewShow = (id: string) => {
    navigate(`/show/${id}`);
  };

  const handleEditShow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/show/edit/${id}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in_progress': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Current Shows
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isAdmin && (
        <Button
          color="inherit"
          startIcon={<AddIcon />}
          onClick={() => navigate('/show/new')}
          sx={{ mr: 2 }}
        >
          Add Show
        </Button>
      )}

       {/* {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : shows.length === 0 ? (
        <Alert severity="info">No shows available</Alert>
      ) : ( */}

      {shows.length === 0 ? (
        <Alert severity="info">{t('No shows available')}</Alert>
      ) : (
        <Grid container spacing={3}>
          {shows.map((show) => (
            <Grid item xs={12} sm={6} md={4} key={show.id}>
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
                <CardMedia
                  component="div"
                  sx={{
                    pt: '56.25%',
                    bgcolor: 'primary.main',
                    position: 'relative',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TheaterIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
                  </Box>
                </CardMedia>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                    <Typography variant="h5" component="div">
                      {show.title}
                    </Typography>
                    <Chip
                      label={show.status}
                      color={getStatusColor(show.status)}
                      size="small"
                    />
                  </Box>

                  {show.genre && (
                    <Chip label={show.genre} size="small" sx={{ mb: 1 }} />
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <TheaterIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {show.theaterName}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {show.nextPerformanceDate 
                          ? `Next: ${formatDate(show.nextPerformanceDate)}`
                          : 'No upcoming performances'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <MoneyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        From {show.currency} {show.baseTicketPrice}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="success.main">
                      {show.availablePerformances} performance{show.availablePerformances !== 1 ? 's' : ''} available
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleViewShow(show.id)}
                    disabled={show.availablePerformances === 0}
                  >
                    View Performances
                  </Button>
                  {(true || isAdmin) && (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={(e) => handleEditShow(show.id, e)}
                      sx={{ ml: 1 }}
                    >
                      Edit
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ShowList;
