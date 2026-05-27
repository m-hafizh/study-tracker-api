const normalizeOrigin = (origin: string): string => origin.trim().replace(/\/+$/, '');

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const wildcardToRegExp = (pattern: string): RegExp => {
  const escapedPattern = pattern
    .split('*')
    .map((segment) => escapeRegex(segment))
    .join('.*');

  return new RegExp(`^${escapedPattern}$`);
};

export const createCorsOriginMatcher = (allowedOrigins: string[]) => {
  const normalizedOrigins = allowedOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter((origin) => origin.length > 0);

  if (normalizedOrigins.length === 0) {
    return (_origin?: string | null): boolean => true;
  }

  const exactOrigins = new Set<string>();
  const wildcardOrigins: RegExp[] = [];

  for (const origin of normalizedOrigins) {
    if (origin.includes('*')) {
      wildcardOrigins.push(wildcardToRegExp(origin));
      continue;
    }

    exactOrigins.add(origin);
  }

  return (origin?: string | null): boolean => {
    if (!origin) {
      return true;
    }

    const normalizedOrigin = normalizeOrigin(origin);

    if (exactOrigins.has(normalizedOrigin)) {
      return true;
    }

    return wildcardOrigins.some((pattern) => pattern.test(normalizedOrigin));
  };
};