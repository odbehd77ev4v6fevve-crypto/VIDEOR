export const getInitials = (displayName: unknown): string => {
  if (typeof displayName !== 'string') return 'U';

  const parts = displayName
    .trim()
    .split(/\s+/u)
    .filter((part) => Array.from(part).length > 0);

  if (parts.length === 0) return 'U';

  const first = Array.from(parts[0])[0];
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] : '';
  return `${first}${last}`.toLocaleUpperCase();
};
