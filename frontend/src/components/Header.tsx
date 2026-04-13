import { AppBar, Toolbar } from '@mui/material';
import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
}

export const isEmbed = new URLSearchParams(window.location.search).has('embed');

function Header({ children }: HeaderProps) {
  if (isEmbed) return null; // hide the whole toolbar

  return (
    <AppBar 
      position="fixed"
      elevation={12}
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: (theme) => theme.palette.primary.main,
      }}
    >
      <Toolbar>
        {children}
      </Toolbar>
    </AppBar>
  );
}

export default Header;
