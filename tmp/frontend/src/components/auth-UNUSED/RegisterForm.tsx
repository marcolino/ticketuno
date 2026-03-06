import { Box, TextField, Button, Link, Typography } from "@mui/material";

const RegisterForm = ({ flow }: any) => {

  return (
    <Box sx={{ pt: 2 }}>

      <TextField
        label="First Name"
        fullWidth
        value={flow.registerFirstName}
        onChange={(e) => flow.setRegisterFirstName(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Last Name"
        fullWidth
        value={flow.registerLastName}
        onChange={(e) => flow.setRegisterLastName(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Email"
        type="email"
        fullWidth
        value={flow.registerEmail}
        onChange={(e) => flow.setRegisterEmail(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Phone (optional)"
        fullWidth
        value={flow.registerPhone}
        onChange={(e) => flow.setRegisterPhone(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Password"
        type="password"
        fullWidth
        value={flow.registerPassword}
        onChange={(e) => flow.setRegisterPassword(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1 }}
      >
        A verification code will be sent to your email
      </Typography>

      <Button
        variant="contained"
        fullWidth
        onClick={flow.handleRegister}
        disabled={flow.loading}
        sx={{ mb: 2 }}
      >
        Register
      </Button>

      <Link component="button" onClick={() => flow.setTab("login")}>
        Already have an account? Login
      </Link>

    </Box>
  );
};

export default RegisterForm;
