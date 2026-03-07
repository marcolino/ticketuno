import { ReactNode, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  IconButton,
} from '@mui/material';
import {
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { useDialog } from '../contexts/DialogContext';
import { globalApi } from '@/services/api';
import config from '../config';
import pkg from '../../package.json';

interface FooterProps {
  children?: ReactNode;
}

function Footer({ children }: FooterProps) {
  const [backendVersion, setBackendVersion] = useState('...');
  const [backendLastCommit, setBackendLastCommit] = useState('...');
  const [backendLastCommitDate, setBackendLastCommitDate] = useState('...');
  const { t } = useTranslation();
  const showDialog = useDialog();

  useEffect(() => {
    (async () => {
      try {
        const response = await globalApi.version();
        setBackendVersion(response?.data?.version ?? '?');
        setBackendLastCommit(response?.data?.lastCommit ?? '?');
        setBackendLastCommitDate(response?.data?.lastCommitDate ?? '?');
     } catch (err: any) {
        setBackendVersion(err?.message ?? '¿');
        setBackendLastCommit(err?.message ?? '¿');
        setBackendLastCommitDate(err?.message ?? '¿');
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
              © {new Date().getFullYear()} {config.app.name}
              <IconButton
                size="small"
                onClick={() =>
                  showDialog({
                    title: t('Version'),
                    content: (
                      <>
                        <div>Frontend v{pkg.version}</div>
                        <div>Backend v{backendVersion}</div>
                        <div>Last commit: #{backendLastCommit}</div>
                        <div>Last commit date: {backendLastCommitDate}</div>
                      </>
                    ),
                    showCloseIcon: true,
                    shrinkToContent: true,
                  })
                }
                aria-label="info"
              >
                <InfoOutlinedIcon fontSize="small" sx={{fontSize: 14}} />
              </IconButton>
              
            </Typography>
          </>
        )
        }
      </Container>
    </Box>
  );
}

export default Footer;
