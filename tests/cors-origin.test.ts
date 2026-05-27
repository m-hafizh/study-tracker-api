import { describe, expect, it } from 'vitest';

import { createCorsOriginMatcher } from '../src/shared/cors.js';

describe('createCorsOriginMatcher', () => {
  it('allows requests without origin header', () => {
    const isOriginAllowed = createCorsOriginMatcher(['https://app.example.com']);

    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed(null)).toBe(true);
  });

  it('allows all origins when allowlist is empty', () => {
    const isOriginAllowed = createCorsOriginMatcher([]);

    expect(isOriginAllowed('https://any-origin.example.com')).toBe(true);
  });

  it('matches exact origins and normalizes trailing slash', () => {
    const isOriginAllowed = createCorsOriginMatcher(['https://app.example.com/']);

    expect(isOriginAllowed('https://app.example.com')).toBe(true);
    expect(isOriginAllowed('https://app.example.com/')).toBe(true);
  });

  it('matches wildcard Vercel preview origins', () => {
    const isOriginAllowed = createCorsOriginMatcher([
      'https://study-tracker-*-wachana-dev.vercel.app'
    ]);

    expect(isOriginAllowed('https://study-tracker-pj1vvp7fg-wachana-dev.vercel.app')).toBe(true);
  });

  it('rejects non-matching origins', () => {
    const isOriginAllowed = createCorsOriginMatcher([
      'https://study-tracker-*-wachana-dev.vercel.app'
    ]);

    expect(isOriginAllowed('https://evil.example.com')).toBe(false);
  });
});