import { Stack, Box, Typography, TypographyVariant, StackProps } from '@mui/material';
import { ReactNode } from 'react';

interface TitleProps extends StackProps {
  icon?: ReactNode;
  children: ReactNode;
  variant?: TypographyVariant;
  component?: React.ElementType;
  spacing?: number;
  iconPosition?: 'left' | 'right';
  iconColor?: string;
  centered?: boolean;
}

const Title = ({
  icon,
  children,
  variant = 'h5',
  component = 'h1',
  spacing = 1,
  fontWeight = 600,
  iconPosition = 'left',
  centered = true,
  iconColor = 'primary.main',
  sx,
  ...stackProps
}: TitleProps) => {

   const renderIcon = () => {
    if (!icon) return null;
    
    return (
      <Box 
        sx={{ 
          color: iconColor,
          display: 'flex',
          alignItems: 'center',
          // '& svg': {
          //   fontSize: 'inherit' // Makes icon match text size better
          // }
        }}
      >
        {icon}
      </Box>
    );
   };
  
  const typographyElement = (
    <Typography 
      variant={variant} 
      component={component} 
      sx={{ fontWeight }}
    >
      {children}
    </Typography>
  );

  return (
    <Stack 
      direction="row" 
      spacing={spacing} 
      alignItems="center" 
      justifyContent={centered ? 'center' : 'flex-start'} 
      sx={{ mb: 3, ...sx }}
      {...stackProps}
    >
      {iconPosition === 'left' && renderIcon()}
      {typographyElement}
      {iconPosition === 'right' && renderIcon()}
    </Stack>
  );
};

export default Title;