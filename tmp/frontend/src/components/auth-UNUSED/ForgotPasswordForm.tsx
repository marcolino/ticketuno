import { Box, TextField, Button, Link, Typography } from "@mui/material";

const ForgotPasswordForm = ({ flow }: any) => {

  return (
    <Box sx={{ pt: 2 }}>

      <Typography sx={{ mb: 2 }}>
        Enter your email address and we'll send you a code to reset your password
      </Typography>

      <TextField
        label="Email"
        type="email"
        fullWidth
        value={flow.forgotEmail}
        onChange={(e) => flow.setForgotEmail(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        variant="contained"
        fullWidth
        onClick={flow.handleForgotPassword}
        disabled={flow.loading || !flow.forgotEmail}
        sx={{ mb: 2 }}
      >
        Send Reset Code
      </Button>

      <Link component="button" onClick={() => flow.setTab("login")}>
        Back to Login
      </Link>

    </Box>
  );
};

export default ForgotPasswordForm;
