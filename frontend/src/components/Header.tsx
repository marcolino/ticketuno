import { AppBar, Toolbar, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
}

function Header({ children }: HeaderProps) {
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
        {children || <Typography variant="h6">App</Typography>}
      </Toolbar>
    </AppBar>
  );
}

export default Header;
