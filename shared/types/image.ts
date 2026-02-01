// Type definitions
export type ImageType = 'poster' | 'website' | 'banner' | 'thumbnail';

export interface ImageMetadata {
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  imageType: string;
}

export interface StoredImage {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  imageType: string;
  uploadedAt: string;
}

export interface UploadedImage {
  url: string;
  size: number;
  timestamp: Date;
  type: ImageType;
}

export interface ImageUploadSectionProps {
  type: ImageType;
  label: string;
  aspectRatio?: number;
  uploadedImage: UploadedImage | null;
  onUploadClick: () => void;
  onPreviewClick: () => void;
  onClearClick: () => void;
}
