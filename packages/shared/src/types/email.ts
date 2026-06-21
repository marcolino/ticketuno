export type Attachment = {
  filename: string;
  content: Buffer;
};

export type AttachmentWithContentType = {
  filename: string;
  content: Buffer | string; // Buffer for binary files, base64 string also works
  contentType?: string; // E.g. 'application/pdf', 'image/png'
};

export type SendEmailOptions = {
  to: string | string[];
  subject: string;
  template?: string;
  variables?: Record<string, unknown>;
  text?: string;
  html?: string;
  isMarketing?: boolean;
  //attachments?: Attachment[];
  attachments?: Attachment[];
};
