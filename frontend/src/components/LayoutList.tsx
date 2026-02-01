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
  //Chip,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  //CalendarToday as CalendarIcon,
  TheaterComedy as TheaterIcon,
  //AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { layoutApi } from '../services/api';
import { Layout } from '../../../shared/types/layout';
import { useAuth } from '../contexts/AuthContext';
import { i18n } from '../i18n';

const LayoutList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { isAuthenticated, isAdmin } = useAuth();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLayouts();
  }, [isAuthenticated, isAdmin]);

  const loadLayouts = async () => {
    try {
      const response = await layoutApi.getAllLayouts();
      setLayouts(response.data);
      setError(null);
    } catch (err: any) {
      // Show the actual server error message
      setError(err.response?.data?.error || 'Failed to load layouts');
      console.error(err.response?.data || err);
    } finally {
    }
  };

  // const handleViewLayout = (id: string) => {
  //   navigate(`/layout/${id}`);
  // };

  const handleEditLayout = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/layout/edit/${id}`);
  };

  
  const handleDeleteLayout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      /*const response = */await layoutApi.deleteLayout(id);
      const newLayouts = layouts.filter(layout => layout.id !== id);
      setLayouts(newLayouts);
      setError(null);
    } catch (err: any) {
      // Show the actual server error message
      setError(err.response?.data?.error || 'Failed to delete layout');
    } finally {
    }
    navigate(`/layouts`);
  };

  // const formatDate = (dateString?: string) => {
  //   if (!dateString) return 'N/A';
  //   return new Date(dateString).toLocaleDateString();
  // };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('Current Layouts')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && layouts.length === 0 && (
        <Alert severity="info">{t('No layouts available')}</Alert>
      )}
      
      {!error && isAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/layout/new')}
            sx={{ my: 2, mx: 2 }}
          >
            {t('Add Layout')}
          </Button>
        </Box>
      )}

       {/* {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : layouts.length === 0 ? (
        <Alert severity="info">No layouts available</Alert>
      ) : ( */}

      {!error && (
        <Grid container spacing={3}>
          {layouts.map((layout) => (
            <Grid item xs={12} sm={6} md={4} key={layout.id}>
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
                      {layout.name}
                    </Typography>
                    {/* <Chip
                      label={layout.status}
                      color={getStatusColor(layout.status)}
                      size="small"
                    /> */}
                  </Box>

                  {/* {layout.genre && (
                    <Chip label={layout.genre} size="small" sx={{ mb: 1 }} />
                  )} */}

                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        {layout.description}
                      </Typography>
                    </Box>

                    {/* <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {layout.nextPerformanceDate 
                          ? `Next: ${formatDate(layout.nextPerformanceDate)}`
                          : 'No upcoming performances'}
                      </Typography>
                    </Box> */}

                    {/* <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <MoneyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        From {layout.currency} {layout.baseTicketPrice}
                      </Typography>
                    </Box> */}

                    {/* <Typography variant="body2" color="success.main">
                      {layout.availablePerformances} performance{layout.availablePerformances !== 1 ? 's' : ''} available
                    </Typography> */}
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  {/* <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleViewLayout(layout.id)}
                    disabled={layout.availablePerformances === 0}
                  >
                    View Performances
                  </Button> */}
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={(e) => handleEditLayout(layout.id, e)}
                      sx={{ ml: 1 }}
                    >
                      {i18n.t('Edit')}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={(e) => handleDeleteLayout(layout.id, e)}
                      sx={{ ml: 1 }}
                    >
                      {i18n.t('Delete')}
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

export default LayoutList;
