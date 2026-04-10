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
  //Alert,
  CardActions,
} from '@mui/material';
import {
  //Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewCompact as ViewCompactIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import PageHeader from './PageHeader';
import Alert from './Alert';
import { layoutApi } from '@/services/api';
import { Layout } from '@/shared/types/layout';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { handleGuardResult } from '@/utils/guardHandler';
import { ActiveBookingInfo } from '@/shared/types/guard';
import { getErrorMessage } from '@/shared/utils/misc';
//import { i18n } from '@/i18n';

const LayoutList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showDialog = useDialog();
  const { isOperator, loading } = useAuth();
  const [layouts, setLayouts] = useState<Layout[]>([]);
  const [navigateTo, setNavigateTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOperator) {
      loadLayouts();
    }
  }, [isOperator]);

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
      setError(getErrorMessage(error));
      //toast.error(getErrorMessage(error));
      // Show the actual server error message
      // setError(err.response?.data?.error || 'Failed to load layouts');
      //console.error(err.response?.data || err);
    }
  };

  // const handleViewLayout = (id: string) => {
  //   navigate(`/layout/${id}`);
  // };

  const handleEditLayout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: layout } = await layoutApi.getLayoutById(id);

      // Assert that layout contains the guard fields (as returned by backend)
      const guardResult = layout as Layout & { editable: boolean; blockedBy: ActiveBookingInfo[] };
      
      const { success: isEditable, wasBlocked, canceled } = await handleGuardResult(
        guardResult, // result has `editable` and `blockedBy`
        'editable', // successKey
        'layout', // action
        showDialog,
        toast,
        t,
        () => navigate(-1) // onCancel: go back
      );

      if (canceled) {
        return; // Already navigated back via onCancel, just exit
      }

      if (wasBlocked) {
        // setNavigateTo('/bookings');
        // return;
        const openReadonly = await showDialog({
          title: t('Layout locked'),
          content: t('Do you want to open the layout in read-only mode?'),
          confirmText: t('Open read-only'),
          cancelText: t('Go to bookings'),
        });
        if (openReadonly) {
          navigate(`/layout/edit/${id}?readonly=true`);
        } else {
          setNavigateTo('/bookings');
        }
        return;
      }

      if (isEditable) {
        navigate(`/layout/edit/${id}`);
      } else {
        // This case should rarely happen because blocked layouts would have triggered the warning.
        // But if it does, you can show a read‑only view.
        toast.warning(t('Layout cannot be edited due to active bookings. Opening read-only view.'));
        navigate(`/layout/edit/${id}?readonly=true`);
      }
    } catch (error) {
      setError(t('Failed to check layout editability: {{error}}', { error: getErrorMessage(error) }));
    }
  };

  const handleDeleteLayout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showDialog({
      title: t('Delete a layout'),
      content: t('Are you sure you want to delete this layout?'),
      cancelText: t('Cancel'),
      confirmText: t('Delete'),
      onConfirm: async () => {
        try {
          const response = await layoutApi.deleteLayout(id);
          const { success, wasBlocked } = await handleGuardResult(response.data, 'deleted', 'layout', showDialog, toast, t);
          if (wasBlocked) {
            setNavigateTo('/bookings');
            return;
          }
          if (!success) return;
          // success path continues here
          toast.success(t('Layout deleted successfully'));
          await loadLayouts();
        
          // const newLayouts = layouts.filter(layout => layout.id !== id);
          // setLayouts(newLayouts);
          setError('');
        } catch (error) {
          // Show the actual server error message
          setError(getErrorMessage(error));
          //toast.error(getErrorMessage(error));
        }
        navigate(`/layouts`);
      }
    });
    navigate(`/layouts`);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader
        title={t('Layouts')}
        showAdd={isOperator}
        addLabel={t('Add Layout')}
        onAdd={() => navigate('/layout/new')}
      />

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {!loading && !error && layouts.length === 0 && (
        <Alert severity="info">{t('No layouts available')}</Alert>
      )}
      
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
                  <ViewCompactIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
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
                {isOperator && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={(e) => handleEditLayout(layout.id, e)}
                    sx={{ ml: 1 }}
                  >
                    {t('Edit')}
                  </Button>
                )}
                {isOperator && (
                  <Button
                    variant="outlined"
                    startIcon={<DeleteIcon />}
                    onClick={(e) => handleDeleteLayout(layout.id, e)}
                    sx={{ ml: 1 }}
                  >
                    {t('Delete')}
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default LayoutList;
