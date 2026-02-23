import { useState, useEffect } from 'react';
import { Box, Container, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { globalApi } from '@/services/api';
import config from '../config';
import pkg from '../../package.json';

interface FooterProps {
  children?: ReactNode;
}

function Footer({ children }: FooterProps) {
  const [backendVersion, setBackendVersion] = useState('...');

  useEffect(() => {
    (async () => {
      try {
        const response = await globalApi.version();
        setBackendVersion(response?.data?.version ?? '?');
      } catch (err: any) {
        setBackendVersion(err?.message ?? '¿');
      }
    })();
  });

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        //boxShadow: '0px -2px 4px -1px rgba(0,0,0,0.2)',
        backgroundColor: (theme) => theme.palette.background.paper,
      }}
    >
      <Container>
        {children || (
          <>
            <Typography variant="body2" align="center" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
              © {new Date().getFullYear()} {config.app.name} - 
              Frontend v{pkg.version}, Backend v{backendVersion}
            </Typography>
          </>
        )
        }
      </Container>
    </Box>
  );
}

export default Footer;
