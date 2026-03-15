import { ReactNode } from 'react';
import { Box, Container, Toolbar } from '@mui/material';
import type { Breakpoint } from '@mui/material';

interface BodyProps {
  children?: ReactNode;
  maxWidth?: Breakpoint | false;
}

function Body({ children, maxWidth = 'xl' }: BodyProps) {
  return (
    <>
      <Toolbar /> {/* Spacer */}
      <Box 
        component="main" 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1, // Fill remaining vertical space
          minHeight: 0,
          overflow: 'hidden',
          py: 3,
        }}
        
      >
        <Container
          maxWidth={maxWidth}
          sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          {children}
        </Container>
      </Box>
    </>
  );
}

export default Body;
