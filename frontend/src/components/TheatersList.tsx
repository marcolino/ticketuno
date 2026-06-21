import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Box,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Curtains as CurtainsIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { theaterApi, layoutApi } from '@/services/api';
import { Layout } from '@ticketuno/shared/types/layout';
import { Theater } from '@ticketuno/shared/types/theater';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';
import { handleGuardResult } from '@/utils/guardHandler';
import PageHeader from './PageHeader';
import Alert from './Alert';

const TheatersList: React.FC = () => {
  const { t } = useTranslation();
  const { isOperator, loading } = useAuth();
  const navigate = useNavigate();
  const showDialog = useDialog();
  const [theaters, setTheaters] = useState<Theater[] | null>(null); // ← null = not loaded
  const [layouts, setLayouts] = useState<Layout[] | null>(null); // ← null = not loaded
  const [error, setError] = useState<string | null>(null);
  const [navigateTo, setNavigateTo] = useState<string | null>(null);

  useEffect(() => {
    if (isOperator) {
      loadTheaters();
    }
  }, [isOperator]);

  const loadTheaters = async () => {
    try {
      // setLoading(true);
      const response = await theaterApi.getAllTheaters();
      setTheaters(response.data);
      //console.log('THEATERS:', response.data);
      setError(null);
    } catch (error) {
      setTheaters(null);
      setError(getErrorMessage(error));
      //toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (theaters?.length) {
      loadLayouts();
    }
  }, [theaters]);

  useEffect(() => {
    if (navigateTo) {
      navigate(navigateTo);
      setNavigateTo(null);
    }
  }, [navigateTo]);

  const loadLayouts = async () => {
    try {
      const response = await layoutApi.getAllLayouts();
      setLayouts(response.data);
      setError(null);
    } catch (error) {
      // Show the actual server error message
      setLayouts(null);
      setError(getErrorMessage(error));
      //toast.error(getErrorMessage(error));
    }
  };

  // const handleEditLayout = (current_layout_id: string, theater_id: string) => {
  //   if (current_layout_id) { // a layout is set already
  //     navigate(`/layout/edit/${current_layout_id}}`);
  //   } else {
  //     navigate(`/layout/new/${theater_id}`);
  //   }
  // };

  const handleEditTheater = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/theater/edit/${id}`);
  };
  
  const handleDeleteTheater = async (id: string, e: React.MouseEvent) => { 
    e.stopPropagation();
    showDialog({
      title: t('Delete a theater'),
      content: t('Are you sure you want to delete this theater?'),
      cancelText: t('Cancel'),
      confirmText: t('Delete'),
      onConfirm: async () => {
        const response = await theaterApi.deleteTheater(id);
        const { success, wasBlocked } = await handleGuardResult(response.data, 'deleted', 'theater', showDialog, toast, t);
        if (wasBlocked) {
          setNavigateTo('/bookings');
          return;
        }
        if (!success) return;
        // success path continues here
        toast.success(t('Theater deleted successfully'));
        await loadTheaters();
      }
    });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      
      {isOperator && (
        <PageHeader
          title={t('Theaters')}
          showAdd={isOperator}
          addLabel={t('Add Theater')}
          onAdd={() => navigate('/theater/new')}
        />
      )}

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {!loading && !error && theaters && theaters.length === 0 && (
        <Alert severity="info">
          {t('No theaters available')}
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
                    <CurtainsIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
                  </Box>
                </CardMedia>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {theater.name}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Description')}: {theater.description}
                    </Typography>
                    {/* <Typography
                      variant="body2" color="text.secondary"
                      //color={theater.status === 'active' ? 'success.main' : 'error.main'}
                    >
                      {t('Active')}: {theater.status === 'active' ? t('Yes') + ' ' + '🟢' : t('No') + ' ' + '🔴'  }
                    </Typography> */}
                    <Typography
                      variant="body2" color="text.secondary"
                    >
                      {t('Layout')}: {
                        layouts?.find(layout => layout.id === theater.currentLayoutId)?.name || 
                        t('No layout assigned')
                      }
                      {/* {t('Layout')}: {layouts && layouts.find(layout => layout.id === theater.currentLayoutId).name} */}
                      {/* theater.currentLayoutId ? t('Yes') : t('No') } */}
                    </Typography>
                  </Box>
                </CardContent>
                <Box sx={{ p: 2 }}>
                   {isOperator && (
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={(e) => handleEditTheater(theater.id, e)}
                      size={"small"}
                      sx={{ m: .5 }}
                    >
                      {t('Edit')}
                    </Button>
                  )}
                  {isOperator && (
                    <Button
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={(e) => handleDeleteTheater(theater.id, e)}
                      size={"small"}
                      sx={{ m: .5 }}
                    >
                      {t('Delete')}
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

export default TheatersList;
