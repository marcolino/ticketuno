import { ReactNode, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  IconButton,
  Link,
} from '@mui/material';
import {
  InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { useDialog } from '../contexts/DialogContext';
import OnlineStatus from '@/components/OnlineStatus';
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
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setBackendVersion(message ? ` (${message})` : '?');
        setBackendLastCommit(message ? ` (${message})` : '?');
        setBackendLastCommitDate(message ? ` (${message})` : '?');
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
              
              © {new Date().getFullYear()} {t(config.app.name)}

              {' '}
              <Link
                type="button"
                component="button"
                onClick={async () => await showDialog({
                  title: t('Terms of Service'),
                  content: <iframe src="/terms?embed=1" title="Terms of Service" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />,
                  showCloseIcon: true,
                  shrinkToContent: false,
                  paperSx: { width: { xs: '90vw', sm: '50vw' }, maxWidth: '90vw', height: '90%' },
                })}
                underline="always"
                sx={{ mb: 0.3 }}
              >
                {t('Terms')}
              </Link>
              {' '}
              <Link
                type="button"
                component="button"
                onClick={async () => await showDialog({
                  title: t('Privacy Policy'),
                  content: <iframe src="/privacy?embed=1" title="PrivacyPolicy" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />,
                  showCloseIcon : true,
                  paperSx: { width: { xs: '90vw', sm: '50vw' }, maxWidth: '90vw',  height: '90%' },
                })}
                underline="always"
                sx={{ mb: 0.3 }}  
              >
                {t('Privacy')}
              </Link>

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
              {' '}

              <OnlineStatus />

              <Box component="span" sx={{ ml: 1, fontSize: '0.9em' }}>
                {
                  process.env.NODE_ENV === 'development' ? '🛠️' :
                    process.env.NODE_ENV === 'staging' ? '🚀' :
                      ''
                }
              </Box>
            </Typography>          
          </>
        )
        }
      </Container>
    </Box>
  );
}

export default Footer;
