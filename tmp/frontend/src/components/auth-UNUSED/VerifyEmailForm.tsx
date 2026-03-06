import { Box, TextField, Button, Alert, Link, Typography } from "@mui/material";

const VerifyEmailForm = ({ flow }: any) => {

  return (
    <Box sx={{ pt: 2 }}>

      <Alert severity="info" sx={{ mb: 2 }}>
        A 6-digit verification code has been sent to <strong>{flow.verifyEmailAddress}</strong>
      </Alert>

      <TextField
        label="Verification Code"
        value={flow.verifyCode}
        onChange={(e) =>
          flow.setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))
        }
        fullWidth
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        fullWidth
        onClick={flow.handleVerifyEmail}
        disabled={flow.loading || flow.verifyCode.length !== 6}
        sx={{ mb: 2 }}
      >
        Verify Email
      </Button>

      <Box textAlign="center">

        <Typography variant="body2">
          Didn't receive the code?
        </Typography>

        <Link component="button" onClick={flow.handleResendCode}>
          Resend Code
        </Link>

      </Box>

    </Box>
  );
};

export default VerifyEmailForm;
