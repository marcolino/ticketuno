import { Box, Container, Toolbar } from '@mui/material';
import { ReactNode } from 'react';
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
          flexGrow: 1, // Fill available space
          py: 3,
        }}
      >
        <Container maxWidth={maxWidth}>
          {children}
        </Container>
      </Box>
    </>
  );
}

export default Body;
