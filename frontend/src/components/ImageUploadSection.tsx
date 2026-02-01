import React from 'react';
import {
  Box,
  Button,
  Stack,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import { ImageUploadSectionProps } from '../../../shared/types/image';
// import { t } from 'i18next';
// import config from '../config';

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  label,
  uploadedImage,
  onUploadClick,
  onPreviewClick,
  onClearClick
}) => (
  <Stack direction="row" spacing={2} alignItems="center">
    <Button
      variant="outlined"
      onClick={onUploadClick}
      startIcon={<CloudUploadIcon />}
      size="large"
      sx={{ minWidth: 150 }}
    >
      {label}
    </Button>

    <Box sx={{ position: 'relative' }}>
      <Avatar
        src={uploadedImage?.url || '/placeholder-image.png'}
        sx={{
          width: 42,
          height: 42,
          border: '2px solid',
          borderColor: uploadedImage ? 'success.main' : 'divider',
          bgcolor: uploadedImage ? 'transparent' : 'action.hover',
          cursor: uploadedImage ? 'pointer' : 'default'
        }}
        variant="rounded"
        onClick={uploadedImage ? onPreviewClick : undefined}
      >
        {!uploadedImage && <PhotoCameraIcon fontSize="small" />}
      </Avatar>
    </Box>

    {uploadedImage && (
      <IconButton size="small" onClick={onClearClick} color="error">
        <DeleteIcon fontSize="small" />
      </IconButton>
    )}
  </Stack>
);

export default ImageUploadSection;
