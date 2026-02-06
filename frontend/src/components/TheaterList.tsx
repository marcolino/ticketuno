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
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../contexts/ToastContext';
import { theaterApi, layoutApi } from '../services/api';
import { Layout } from '../../../shared/types/layout';
import { Theater/*, TheaterStats*/ } from '../../../shared/types/theater';

const TheaterList: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  //const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [theaters, setTheaters] = useState<Theater[] | null>(null); // ← null = not loaded
  const [layouts, setLayouts] = useState<Layout[] | null>(null); // ← null = not loaded
  //const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null); // TODO ... do we use error ?

  useEffect(() => {
    //if (isAuthenticated && isAdmin) {
      loadTheaters();
    // } else {
    //   setTheaters(null);
    // }
  }, [isAuthenticated, isAdmin]);

  const loadTheaters = async () => {
    try {
      // setLoading(true);
      const response = await theaterApi.getAllTheaters();
      setTheaters(response.data);
      //console.log("THEATERS:", response.data);
      setError(null);
    } catch (err: any) {
      setTheaters(null);
      setError(err.response?.data?.error);
      toast.error(err.response?.data?.error);
    }
  };

  useEffect(() => {
    if (theaters?.length) {
      loadLayouts();
    //} else {
    //  setLayouts(null);
    }
  }, [theaters/*isAuthenticated, isAdmin*/]);

  const loadLayouts = async () => {
    try {
      const response = await layoutApi.getAllLayouts();
      setLayouts(response.data);
      setError(null);
    } catch (err: any) {
      // Show the actual server error message
      setLayouts(null);
      setError(err.response?.data?.error);
      toast.error(err.response?.data?.error);
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
  //const theme = useTheme();
  
  const handleDeleteTheater = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (theaters) {
      try {
          /*const response = */await theaterApi.deleteTheater(id);
        const newTheaters = theaters.filter(theater => theater.id !== id);
        setTheaters(newTheaters);
        setError(null);
      } catch (err: any) {
        // Show the actual server error message
        setError(err.response?.data?.error);
        toast.error(err.response?.data?.error);
      }
    }
  };
  
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
      
      {isAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4">
            {t('Available Theaters')}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/theater/new')}
          >
            {t('Add Theater')}
          </Button>
        </Box>
      )}

      {/* {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )} */}

      {(theaters && theaters.length === 0) && (
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
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {theater.name}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Description')}: {theater.description}
                    </Typography>
                    <Typography
                      variant="body2" color="text.secondary"
                      //color={theater.status === 'active' ? 'success.main' : 'error.main'}
                    >
                      {t('Active')}: {theater.status === 'active' ? t('Yes') + ' ' + '🟢' : t('No') + ' ' + '🔴'  }
                    </Typography>
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
                   {isAdmin && (
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
                  {/* {isAdmin && (
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditLayout(theater.currentLayoutId, theater.id)}
                      size={"small"}
                      sx={{ m: .5 }}
                    >
                      {t('Layout')}
                    </Button>
                  )} */}
                 
                  {isAdmin && (
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

export default TheaterList;
