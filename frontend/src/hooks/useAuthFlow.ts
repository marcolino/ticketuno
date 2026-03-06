import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/contexts/ToastContext";
import { getErrorMessage } from "@/utils/misc";
import useNavigate from "@/hooks/useNavigate";

export type TabValue = "login" | "register" | "verify" | "forgot" | "reset";

export const useAuthFlow = (onClose: () => void) => {
  const { login, register, verifyEmail, resendVerification, forgotPassword, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabValue>("login");
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFirstName, setRegisterFirstName] = useState("");
  const [registerLastName, setRegisterLastName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");

  const [verifyEmailAddress, setVerifyEmailAddress] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const [forgotEmail, setForgotEmail] = useState("");

  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const handleLogin = async () => {
    try {
      setLoading(true);

      const response = await login({
        email: loginEmail,
        password: loginPassword,
      });

      if (response.requiresVerification) {
        setVerifyEmailAddress(response.email);
        setTab("verify");
        toast.warning("Please verify your email first");
        return;
      }

      toast.success("Login successful!");
      onClose();

      const redirect = localStorage.getItem("redirectAfterLogin");
      localStorage.removeItem("redirectAfterLogin");

      navigate(redirect || "/", { replace: true });

    } catch (error: any) {
      toast.warning(`Login failed: ${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);

      const response = await register({
        email: registerEmail,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        phone: registerPhone,
      });

      setVerifyEmailAddress(response.email);
      setTab("verify");

      toast.success("Registration successful!");

    } catch (error: any) {
      toast.error(`Registration failed (${getErrorMessage(error)})`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      setLoading(true);

      await verifyEmail({
        email: verifyEmailAddress,
        code: verifyCode,
      });

      toast.success("Email verified!");
      onClose();

      navigate("/", { replace: true });

    } catch (error: any) {
      toast.error(`Verification failed (${getErrorMessage(error)})`);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);

      const response = await resendVerification(verifyEmailAddress);

      if (response.verificationCode) { // development only
        console.log(
          'Verification code is %c' + response.verificationCode,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }

      toast.success('Verification code resent! Check your email.');

    } catch (error: any) {
      toast.error(`Code resend failed (${getErrorMessage(error)})`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleForgotPassword = async () => {
    try {
      setLoading(true);

      await forgotPassword({ email: forgotEmail });

      setResetEmail(forgotEmail);
      setTab("reset");

      toast.success("Reset code sent!");

    } catch (error: any) {
      toast.error(`Reset code failed (${getErrorMessage(error)})`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);

      await resetPassword({
        email: resetEmail,
        code: resetCode,
        newPassword,
      });

      setTab("login");
      toast.success("Password reset successful!");

    } catch (error: any) {
      toast.error(`Password reset failed (${getErrorMessage(error)})`);
    } finally {
      setLoading(false);
    }
  };

  return {
    tab,
    setTab,
    loading,

    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,

    registerEmail,
    setRegisterEmail,
    registerPassword,
    setRegisterPassword,
    registerFirstName,
    setRegisterFirstName,
    registerLastName,
    setRegisterLastName,
    registerPhone,
    setRegisterPhone,

    verifyEmailAddress,
    verifyCode,
    setVerifyCode,

    forgotEmail,
    setForgotEmail,

    resetEmail,
    resetCode,
    setResetCode,
    newPassword,
    setNewPassword,

    handleLogin,
    handleRegister,
    handleVerifyEmail,
    handleResendCode,
    handleForgotPassword,
    handleResetPassword,
  };
};
