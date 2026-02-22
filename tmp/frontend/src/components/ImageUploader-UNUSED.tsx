import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Stack,
  Card,
  //CardContent
} from '@mui/material';
import {
  CloudUpload,
  InsertPhoto,
  CheckCircle
} from '@mui/icons-material';
import imageCompression from 'browser-image-compression';

interface CompressedInfo {
  originalSize: string;
  compressedSize: string;
  reduction: string;
}

const ImageUploader = ({ onImageSelected, setIsLoading}) => {
  const [error, setError] = useState('');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressedInfo, setCompressedInfo] = useState<CompressedInfo | null>(null);
  //const [compressedInfo, setCompressedInfo] = useState(null);

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 1, // Max file size in MB
      maxWidthOrHeight: 1920, // Max width/height
      useWebWorker: true,
      onProgress: (progress) => {
        setCompressionProgress(Math.round(progress));
      }
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const beforeSize = (file.size / 1024 / 1024).toFixed(2);
      const afterSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      
        setCompressedInfo({
          originalSize: beforeSize,
          compressedSize: afterSize,
          reduction: ((1 - compressedFile.size / file.size) * 100).toFixed(1)
        });

      return compressedFile;
    } catch (error) {
      console.error('Compression error:', error);
      return file; // Return original if compression fails
    }
  };

  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    setError('');
    setCompressionProgress(0);
    setCompressedInfo(null);

    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setError('File is too large. Maximum size is 10MB');
      } else if (error.code === 'file-invalid-type') {
        setError('Please upload a valid image (JPEG, PNG, WebP)');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setIsLoading(true);
      try {
        const file = acceptedFiles[0];
        
        // Compress image
        const compressedFile = await compressImage(file);
        
        const reader = new FileReader();
        reader.onload = () => {
          onImageSelected({
            file: compressedFile,
            preview: reader.result,
            name: compressedFile.name,
            size: compressedFile.size,
            originalSize: file.size
          });
          setIsLoading(false);
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        setError('Failed to process image');
        setIsLoading(false);
      }
    }
  }, [onImageSelected, setIsLoading]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  return (
    <Box>
      <Card
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'divider',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        
        <Box sx={{ py: 3 }}>
          {isDragActive ? (
            <>
              <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" color="primary">
                Drop the image here
              </Typography>
            </>
          ) : (
            <>
              <InsertPhoto sx={{ fontSize: 60, color: 'action.active', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Drag & drop an image here
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                or click to browse files
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supports: JPEG, PNG, WebP • Max: 10MB
              </Typography>
            </>
          )}
        </Box>
      </Card>

      {compressionProgress > 0 && compressionProgress < 100 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" gutterBottom>
            Compressing image... {compressionProgress}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={compressionProgress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}

      {compressedInfo && (
        <Alert 
          severity="success" 
          icon={<CheckCircle />}
          sx={{ mt: 2 }}
        >
          Image compressed: {compressedInfo.originalSize}MB → {compressedInfo.compressedSize}MB 
          ({compressedInfo.reduction}% reduction)
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mt: 3, justifyContent: 'center' }}>
        <Button variant="outlined" startIcon={<CloudUpload />}>
          Sample Image 1
        </Button>
        <Button variant="outlined" startIcon={<CloudUpload />}>
          Sample Image 2
        </Button>
      </Stack>
    </Box>
  );
};

export default ImageUploader;
