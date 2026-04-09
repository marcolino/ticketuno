// ImageUploadSection.tsx
import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Button, Stack, Avatar, IconButton,
  Dialog, DialogContent, DialogActions, Box,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CloudUpload as CloudUploadIcon,
  PhotoCamera as PhotoCameraIcon,
} from '@mui/icons-material';
import ImageUploadEditPopup from './ImageUploadEditPopup'; // adjust path
import { ImageType } from '@/shared/types/image';

interface ImageUploadSectionProps {
  label: string;
  imageFilename: string | null;
  onImageChange: (filename: string | null) => void; // called after upload or clear
  imageType?: ImageType;            // e.g. 'poster', 'avatar'
  maxSizeMB?: number;
  fixedAspectRatio?: number;        // optional fixed crop aspect ratio
}

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  label,
  imageFilename,
  onImageChange,
  imageType = 'poster',
  maxSizeMB = 5,
  fixedAspectRatio,
}) => {
  const theme = useTheme();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);

  const previewUrl = imageFilename ? `/uploads/${imageFilename}` : null;
  const textFieldHeight = theme.spacing(7);

  const handleUploadClick = () => {
    setPopupOpen(true);
  };

  const handlePopupSave = (filename: string) => {
    onImageChange(filename);
    setPopupOpen(false);
  };

  const handleClear = () => {
    onImageChange(null);
  };

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="outlined"
          onClick={handleUploadClick}
          startIcon={<CloudUploadIcon />}
          size="large"
          sx={{
            maxWidth: 50,
            height: textFieldHeight,
            boxSizing: 'border-box',
            borderWidth: '1px',
            borderStyle: 'solid',
            '&:hover': { borderWidth: '1px' }
          }}
        >
          {label}
        </Button>
        <Avatar
          src={previewUrl || '/placeholder-image.png'}
          variant="rounded"
          onClick={() => previewUrl && setPreviewOpen(true)}
          sx={{
            width: textFieldHeight,
            height: textFieldHeight,
            boxSizing: 'border-box',
            border: '1px solid',
            borderColor: imageFilename ? 'success.main' : 'divider',
            bgcolor: imageFilename ? 'transparent' : 'action.hover',
            cursor: imageFilename ? 'pointer' : 'default'
          }}
        >
          {!imageFilename && <PhotoCameraIcon fontSize="small" />}
        </Avatar>
        {imageFilename && (
          <IconButton size="small" onClick={handleClear} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {/* Preview popup (unchanged) */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        PaperProps={{ sx: { bgcolor: 'background.paper' } }}
      >
        <DialogContent sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={previewUrl!}
            alt={label}
            sx={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cropping & editing popup – full mode */}
      <ImageUploadEditPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSave={handlePopupSave}
        imageType={imageType}
        maxSizeMB={maxSizeMB}
        fixedAspectRatio={fixedAspectRatio}
        title={`Edit ${label}`}
        simpleMode={false}       // use full editor with crop & filters
      />
    </>
  );
};

export default ImageUploadSection;
