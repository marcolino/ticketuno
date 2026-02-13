export type ImageType = 'poster' | 'website' | 'profile' | 'banner' | 'thumbnail';

// This is all you need for the frontend components now
export interface ImageUploadSectionProps {
  label: string;
  imageFilename: string | null;   // just the filename, e.g. "poster-abc123.jpg"
  onUploadClick: () => void;
  onClearClick: () => void;
}
