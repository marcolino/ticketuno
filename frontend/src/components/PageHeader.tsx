import React from 'react';
import {
  Box,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface PageHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  showAdd?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  onAdd,
  addLabel = 'Add',
  showAdd = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        mb: 3,
        pb: 0.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Typography
        variant="h5"
        sx={{
          fontWeight: 600,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </Typography>

      {showAdd && onAdd && (
        <Button
          variant="contained"
          color="primary"
          size={isMobile ? 'small' : 'medium'}
          onClick={onAdd}
          startIcon={!isMobile ? <AddIcon /> : undefined}
          sx={{
            minWidth: isMobile ? 36 : undefined,
            px: isMobile ? 1 : 2,
          }}
        >
          {isMobile ? <AddIcon /> : addLabel}
        </Button>
      )}
    </Box>
  );
};

export default PageHeader;
