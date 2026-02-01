import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploadEditPopup from './ImageUploadEditPopup';

test('uploads and edits image', async () => {
  const onSave = jest.fn();
  render(<ImageUploadEditPopup open onClose={jest.fn()} onSave={onSave} />);
  
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  const input = screen.getByLabelText(/upload/i);
  
  await userEvent.upload(input, file);
  
  await waitFor(() => {
    expect(screen.getByText(/edit/i)).toBeInTheDocument();
  });
});
