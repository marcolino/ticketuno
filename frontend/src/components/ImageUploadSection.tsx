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
import { ImageUploadSectionProps } from '@ticketuno/shared/types/image';

const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  label,
  imageFilename,
  onUploadClick,
  onClearClick
}) => {
  const theme = useTheme();
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewUrl = imageFilename ?
    `/uploads/${imageFilename}` :
    null
  ;
  // Medium TextField height = 56px (7 * 8px spacing unit)
  const textFieldHeight = theme.spacing(7);

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="outlined"
          onClick={onUploadClick}
          startIcon={<CloudUploadIcon />}
          size="large"
          sx={{
            m_axWidth: 50,
            height: textFieldHeight,
            boxSizing: 'border-box',
            borderWidth: '1px',
            borderStyle: 'solid',
            '&:hover': {
              borderWidth: '1px',
            }
          }}
        >
          {label}
        </Button>
        <Avatar
          src={previewUrl || '/placeholder-image.png'}
          variant="rounded"
          //onClick={() => previewUrl && window.open(previewUrl, '_blank')}
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
          <IconButton size="small" onClick={onClearClick} color="error">
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {/* Preview popup */}
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
    </>
  );
};

export default ImageUploadSection;
