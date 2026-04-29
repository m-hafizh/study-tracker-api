import { FastifyInstance } from 'fastify';

import { env } from '../../../config/env.js';
import { AppError } from '../../../shared/errors.js';
import {
  generateOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  verifyPassword
} from '../../../utils/crypto.js';
import { AuthRepository } from '../repository/auth.repository.js';

type AuthUserResponse = {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

const toAuthUserResponse = (user: {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): AuthUserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly app: FastifyInstance
  ) {}

  public async ensureIndexes(): Promise<void> {
    await this.repository.ensureIndexes();
  }

  public async register(input: {
    email: string;
    name: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: AuthUserResponse }> {
    const existing = await this.repository.findUserByEmail(input.email);
    if (existing) {
      throw new AppError('Email already registered', {
        code: 'EMAIL_EXISTS',
        statusCode: 409
      });
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.repository.createUser({
      email: input.email,
      name: input.name,
      passwordHash
    });

    const { accessToken, refreshToken } = await this.createSession(user.id, user.email);

    return {
      accessToken,
      refreshToken,
      user: toAuthUserResponse(user)
    };
  }

  public async login(input: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; refreshToken: string; user: AuthUserResponse }> {
    const user = await this.repository.findUserByEmail(input.email);
    if (!user) {
      throw new AppError('Invalid credentials', {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401
      });
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new AppError('Invalid credentials', {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401
      });
    }

  const { accessToken, refreshToken } = await this.createSession(user.id, user.email);
    return {
      accessToken,
      refreshToken,
      user: toAuthUserResponse(user)
    };
  }

  public async refresh(input: {
    refreshToken: string;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashOpaqueToken(input.refreshToken);
    const existing = await this.repository.findRefreshToken(tokenHash);

    if (!existing || existing.expiresAt.getTime() < Date.now()) {
      throw new AppError('Invalid refresh token', {
        code: 'INVALID_REFRESH_TOKEN',
        statusCode: 401
      });
    }

    await this.repository.deleteRefreshToken(tokenHash);

  const user = await this.repository.findUserById(existing.userId);
    if (!user) {
      throw new AppError('User not found', {
        code: 'USER_NOT_FOUND',
        statusCode: 404
      });
    }

  return this.createSession(user.id, user.email);
  }

  public async logout(input: { refreshToken: string }): Promise<void> {
    const tokenHash = hashOpaqueToken(input.refreshToken);
    await this.repository.deleteRefreshToken(tokenHash);
  }

  public async me(userId: string): Promise<AuthUserResponse> {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new AppError('User not found', {
        code: 'USER_NOT_FOUND',
        statusCode: 404
      });
    }

    return toAuthUserResponse(user);
  }

  public async updateMe(
    userId: string,
    input: { email?: string; name?: string }
  ): Promise<AuthUserResponse> {
    if (input.email) {
      const existing = await this.repository.findUserByEmail(input.email);
      if (existing && existing.id !== userId) {
        throw new AppError('Email already in use', {
          code: 'EMAIL_EXISTS',
          statusCode: 409
        });
      }
    }

    const updated = await this.repository.updateUser(userId, {
      email: input.email,
      name: input.name
    });

    if (!updated) {
      throw new AppError('User not found', {
        code: 'USER_NOT_FOUND',
        statusCode: 404
      });
    }

    return toAuthUserResponse(updated);
  }

  public async changePassword(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    const user = await this.repository.findUserById(input.userId);
    if (!user) {
      throw new AppError('User not found', {
        code: 'USER_NOT_FOUND',
        statusCode: 404
      });
    }

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AppError('Current password is incorrect', {
        code: 'INVALID_CREDENTIALS',
        statusCode: 401
      });
    }

    const passwordHash = await hashPassword(input.newPassword);
    await this.repository.updateUser(input.userId, { passwordHash });
    await this.repository.deleteAllUserRefreshTokens(input.userId);
  }

  private async createSession(
    userId: string,
    email: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await this.app.jwt.sign(
      {
        sub: userId,
        email
      },
      {
        expiresIn: env.ACCESS_TOKEN_TTL
      }
    );

    const refreshToken = generateOpaqueToken();
    await this.repository.saveRefreshToken({
      userId,
      tokenHash: hashOpaqueToken(refreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000)
    });

    return { accessToken, refreshToken };
  }
}
