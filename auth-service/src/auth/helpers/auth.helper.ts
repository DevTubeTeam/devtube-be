export const extractTokenFromHeader = (
  authorization: string,
): string | null => {
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  return authorization.replace('Bearer ', '').trim();
};
