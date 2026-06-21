export type ImageType = 'poster' | 'website' | 'profile' | 'banner' | 'thumbnail';

export interface ImageUploadSectionProps {
  label: string;
  imageFilename: string | null; // Just the filename
  onUploadClick: () => void;
  onClearClick: () => void;
}
