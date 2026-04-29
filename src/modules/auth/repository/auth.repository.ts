import { prisma } from '../../../db/prisma.js';
import { RefreshTokenDocument, UserDocument } from '../schema/user.schema.js';

export class AuthRepository {
  public async ensureIndexes(): Promise<void> {
    return;
  }

  public async findUserByEmail(email: string): Promise<UserDocument | null> {
    return prisma.user.findFirst({
      where: {
        email: email.toLowerCase()
      }
    });
  }

  public async findUserById(userId: string): Promise<UserDocument | null> {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  public async createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<UserDocument> {
    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: input.passwordHash
      }
    });
  }

  public async updateUser(
    userId: string,
    updates: Partial<Pick<UserDocument, 'name' | 'email' | 'passwordHash'>>
  ): Promise<UserDocument | null> {
    const result = await prisma.user.updateMany({
      where: { id: userId },
      data: {
        ...updates,
        ...(updates.email ? { email: updates.email.toLowerCase() } : {})
      }
    });

    if (result.count === 0) {
      return null;
    }

    return this.findUserById(userId);
  }

  public async saveRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt
      }
    });
  }

  public async findRefreshToken(tokenHash: string): Promise<RefreshTokenDocument | null> {
    return prisma.refreshToken.findUnique({
      where: {
        tokenHash
      }
    });
  }

  public async deleteRefreshToken(tokenHash: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        tokenHash
      }
    });
  }

  public async deleteAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        userId
      }
    });
  }
}
