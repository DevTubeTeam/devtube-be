const allowedMimeTypes = [
  'video/mp4',
  'video/avi',
  'video/mkv',
  'video/mov',
  'video/webm',
];

export const isMimeTypeAllowed = (mimeType: string): boolean => {
  return allowedMimeTypes.includes(mimeType);
};
