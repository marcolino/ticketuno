import React, { useState, useMemo } from 'react';
import { Typography, Link } from '@mui/material';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  moreText?: string,
  lessText?: string,
  defaultExpanded?: boolean;
  variant?: any;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  maxLength = 100,
  defaultExpanded = false,
  moreText = '…',
  lessText = 'less',
  variant = 'body2',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const isLong = text.length > maxLength;

  const displayText = useMemo(() => {
    if (!isLong || expanded) return text;
    return text.slice(0, maxLength); // + '…';
  }, [text, isLong, expanded, maxLength]);

  return (
    <Typography variant={variant} component="div" /*sx={{ lineHeight: 1.1 }}*/>
      {displayText}{' '}

      {isLong && (
        <Link
          component="button"
          underline="none"
          onClick={() => setExpanded(v => !v)}
          sx={{
            ml: 0.5,
            fontSize: '0.75rem',
            lineHeight: 1,
            px: 0.8,
            py: 0.2,
            borderRadius: 0.3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'action.selected',
            },
          }}
        >
          {expanded ? lessText : moreText}
        </Link>
      )}
    </Typography>
  );
};

export default ExpandableText;
