import useNavigate from '@/hooks/useNavigate';
import BookingValidateDialog from './BookingValidateDialog';

const BookingValidate = () => {
  const navigate = useNavigate();

  return (
    <BookingValidateDialog
      open={true}
      onClose={() => navigate(-1)}
    />
  );
};

export default BookingValidate;
