import { Box, Container, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface FooterProps {
  children?: ReactNode;
}

function Footer({ children }: FooterProps) {
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
        {children || <Typography variant="body2" color="text.secondary">© 2024 My App</Typography>}
      </Container>
    </Box>
  );
}

export default Footer;
