export type Platform = 'android' | 'ios' | 'web';

export const getPlatform = (): Platform => {
  const ua = navigator.userAgent;

  if (/android/i.test(ua)) return 'android';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';

  return 'web';
};
