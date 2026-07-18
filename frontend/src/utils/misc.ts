export const getEnvMode = (): 'development' | 'staging' | 'production' => {
  // Use type assertion to avoid TypeScript error
  const mode = (import.meta as any).env?.MODE || 'production';
  return mode;
};
