import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { LockPerson } from "@mui/icons-material";
import { useAuthFlow } from "@/hooks/useAuthFlow";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import VerifyEmailForm from "./VerifyEmailForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ResetPasswordForm from "./ResetPasswordForm";

interface Props {
  open: boolean;
  onClose: () => void;
}

const LoginDialog: React.FC<Props> = ({ open, onClose }) => {

  const flow = useAuthFlow(onClose);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "center" }}>
        <LockPerson sx={{ mr: 1 }} />
        {flow.tab}
      </DialogTitle>

      <DialogContent>

        {flow.tab === "login" && <LoginForm flow={flow} />}
        {flow.tab === "register" && <RegisterForm flow={flow} />}
        {flow.tab === "verify" && <VerifyEmailForm flow={flow} />}
        {flow.tab === "forgot" && <ForgotPasswordForm flow={flow} />}
        {flow.tab === "reset" && <ResetPasswordForm flow={flow} />}

      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
