import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import useNavigate from '@/hooks/useNavigate';
import { useConsent } from "@/contexts/ConsentContext";

const ConsentRedirect: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const { /*updateConsent, */openConsentDialog } = useConsent();
  const navigate = useNavigate();

  useEffect(() => {
    const tokenFromQuery = searchParams.get("token") || token;

    if (tokenFromQuery) {
      // TODO: call your consent API to validate/accept the token
      // For example:
      // await userApi.applyConsentToken(tokenFromQuery);

      console.log("Processing consent token:", tokenFromQuery);

      // Trigger the consent dialog to open
      openConsentDialog();

      // Optionally, you could also pre-fill/update context from server
      // updateConsent({ ... }) 
    }

    // redirect to homepage
    navigate("/", { replace: true });
  }, [token, searchParams, navigate/*, updateConsent*/]);

  return null; // nothing rendered
};

export default ConsentRedirect;
