import { describe, expect, it } from 'vitest';

import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  verifyPassword
} from '../src/utils/crypto.js';

describe('crypto utils', () => {
  it('hashes and verifies password correctly', async () => {
    const hash = await hashPassword('super-secret-password');
    await expect(verifyPassword('super-secret-password', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('hashes opaque token deterministically', () => {
    const token = generateOpaqueToken();
    const first = hashOpaqueToken(token);
    const second = hashOpaqueToken(token);
    expect(first).toBe(second);
  });
});
