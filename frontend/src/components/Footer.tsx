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
            <Typography variant="body2" align="center" color="text.secondary">
              © {new Date().getFullYear()} {config.app.name}
              <IconButton
               
                onClick={() =>
                  showDialog({
                    title: t('Version'),
                    content: (
                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        component="div" // render as inline element
                        sx={{ lineHeight: 1.5 }}
                      >
                        <div>{t('Frontend')}:&nbsp;<strong>v{pkg.version}</strong></div>
                        <div>{t('Backend')}:&nbsp;<strong>v{backendVersion}</strong></div>
                        <div>
                          {t('Last commit')}:&nbsp;
                          <strong>#{backendLastCommit}</strong>
                          &nbsp;{t('on')}&nbsp;<br />
                          <strong>{backendLastCommitDate}</strong>
                        </div>
                      </Typography>
                    ),
                    showCloseIcon: true,
                    shrinkToContent: true,
                  })
                }
                aria-label="info"
              >
                <InfoOutlinedIcon sx={{fontSize: 20}} />
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
