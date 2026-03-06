import { Box, TextField, Button, Alert, Link } from "@mui/material";

const ResetPasswordForm = ({ flow }: any) => {

  return (
    <Box sx={{ pt: 2 }}>

      <Alert severity="info" sx={{ mb: 2 }}>
        A reset code has been sent to <strong>{flow.resetEmail}</strong>
      </Alert>

      <TextField
        label="Reset Code"
        value={flow.resetCode}
        onChange={(e) =>
          flow.setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
        }
        fullWidth
        sx={{ mb: 2 }}
      />

      <TextField
        label="New Password"
        type="password"
        value={flow.newPassword}
        onChange={(e) => flow.setNewPassword(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        fullWidth
        onClick={flow.handleResetPassword}
        disabled={flow.loading || flow.resetCode.length !== 6}
        sx={{ mb: 2 }}
      >
        Reset Password
      </Button>

      <Link component="button" onClick={() => flow.setTab("login")}>
        Back to Login
      </Link>

    </Box>
  );
};

export default ResetPasswordForm;
