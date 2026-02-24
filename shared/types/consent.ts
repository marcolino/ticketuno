export type CookiePreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export type CommunicationPreferences = {
  marketingEmails: boolean;
  pushNotifications: boolean;
};

export type FullConsent = {
  version: string;
  cookies: CookiePreferences;
  communication: CommunicationPreferences;
  timestamp: string;
};
