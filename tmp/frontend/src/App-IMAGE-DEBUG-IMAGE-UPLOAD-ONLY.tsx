import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Alert,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton
} from '@mui/material';
import { CloudUpload, CheckCircle, RestartAlt } from '@mui/icons-material';
import ImageUploader from './components/ImageUploader';
import ImageEditor from './components/ImageEditor';

const steps = ['Upload Image', 'Edit & Crop', 'Preview & Save'];

const App = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [editedImage, setEditedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);

  const handleImageUpload = async (imageData) => {
    setIsLoading(true);
    try {
      setUploadedImage(imageData);
      setActiveStep(1);
      setError('');
    } catch (err) {
      setError('Failed to process image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComplete = (editedBlob) => {
    setEditedImage(URL.createObjectURL(editedBlob));
    setActiveStep(2);
  };

  const handleReset = () => {
    setUploadedImage(null);
    setEditedImage(null);
    setActiveStep(0);
    setError('');
    setHistory([]);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    // Load saved presets from localStorage
    const savedPresets = localStorage.getItem('cropPresets');
    if (savedPresets) {
      // You can use these in your editor component
      console.log('Loaded presets:', JSON.parse(savedPresets));
    }
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          Image Editor Pro
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Upload, edit, and enhance your images
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {isLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Processing image...
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        {activeStep === 0 && (
          <ImageUploader
            onImageSelected={handleImageUpload}
            setIsLoading={setIsLoading}
          />
        )}

        {activeStep === 1 && uploadedImage && (
          <ImageEditor
            imageSrc={uploadedImage.preview}
            onEditComplete={handleEditComplete}
            onCancel={handleReset}
          />
        )}

        {activeStep === 2 && editedImage && (
          <Box>
            <Typography variant="h5" gutterBottom>
              Final Result
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Original
                  </Typography>
                  <CardMedia
                    component="img"
                    image={uploadedImage.preview}
                    alt="Original"
                    sx={{ borderRadius: 1, maxHeight: 300, objectFit: 'contain' }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={`${(uploadedImage.size / 1024 / 1024).toFixed(2)} MB`} 
                      size="small" 
                      variant="outlined" 
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label="Original" 
                      color="default" 
                      size="small" 
                    />
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Edited
                  </Typography>
                  <CardMedia
                    component="img"
                    image={editedImage}
                    alt="Edited"
                    sx={{ borderRadius: 1, maxHeight: 300, objectFit: 'contain' }}
                  />
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label="Edited" 
                      color="success" 
                      size="small"
                      icon={<CheckCircle />}
                      sx={{ mr: 1 }}
                    />
                    <Chip 
                      label="Ready to download" 
                      variant="outlined" 
                      size="small" 
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleDownload}
                startIcon={<CloudUpload />}
                size="large"
              >
                Download Image
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleReset}
                startIcon={<RestartAlt />}
              >
                Start Over
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default App;
