import { Prisma } from '@prisma/client';

import { prisma } from '../../../db/prisma.js';
import { StudySessionDocument, SubjectDocument } from '../schema/study.schema.js';

export class StudyRepository {
  public async ensureIndexes(): Promise<void> {
    return;
  }

  public async listSessions(userId: string, query?: {
    from?: string;
    to?: string;
    subject?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: StudySessionDocument[]; total: number }> {
    const where: Prisma.StudySessionWhereInput = {
      userId
    };

    if (query?.from || query?.to) {
      where.sessionDate = {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T23:59:59.999Z`) } : {})
      };
    }

    if (query?.subject) {
      where.subject = query.subject;
    }

    if (query?.search) {
      where.OR = [
        { subject: { contains: query.search, mode: 'insensitive' } },
        { topic: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 200;

    const [items, total] = await Promise.all([
      prisma.studySession.findMany({
        where,
        orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.studySession.count({ where })
    ]);

    return { items, total };
  }

  public async createSession(input: {
    userId: string;
    subject: string;
    topic: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    date: string;
    notes: string;
  }): Promise<StudySessionDocument> {
    return prisma.studySession.create({
      data: {
        userId: input.userId,
        subject: input.subject,
        topic: input.topic,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes,
        sessionDate: new Date(`${input.date}T00:00:00.000Z`),
        notes: input.notes
      }
    });
  }

  public async findSessionById(userId: string, id: string): Promise<StudySessionDocument | null> {
    return prisma.studySession.findFirst({
      where: {
        id,
        userId
      }
    });
  }

  public async updateSession(
    userId: string,
    id: string,
    updates: Partial<Omit<StudySessionDocument, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<StudySessionDocument | null> {
    const { sessionDate, ...rest } = updates;

    const result = await prisma.studySession.updateMany({
      where: {
        id,
        userId
      },
      data: {
        ...rest,
        ...(sessionDate ? { sessionDate } : {})
      }
    });

    if (result.count === 0) {
      return null;
    }

    return this.findSessionById(userId, id);
  }

  public async deleteSession(userId: string, id: string): Promise<boolean> {
    const result = await prisma.studySession.deleteMany({
      where: {
        id,
        userId
      }
    });

    return result.count > 0;
  }

  public async listSubjects(userId: string): Promise<SubjectDocument[]> {
    return prisma.subject.findMany({
      where: {
        userId
      },
      orderBy: {
        subject: 'asc'
      }
    });
  }

  public async createSubject(input: {
    userId: string;
    subject: string;
    color: string;
  }): Promise<SubjectDocument> {
    return prisma.subject.create({
      data: {
        userId: input.userId,
        subject: input.subject,
        color: input.color
      }
    });
  }

  public async findSubjectById(userId: string, id: string): Promise<SubjectDocument | null> {
    return prisma.subject.findFirst({
      where: {
        id,
        userId
      }
    });
  }

  public async updateSubject(
    userId: string,
    id: string,
    updates: Partial<Pick<SubjectDocument, 'subject' | 'color'>>
  ): Promise<SubjectDocument | null> {
    const result = await prisma.subject.updateMany({
      where: {
        id,
        userId
      },
      data: {
        ...updates
      }
    });

    if (result.count === 0) {
      return null;
    }

    return this.findSubjectById(userId, id);
  }

  public async deleteSubject(userId: string, id: string): Promise<boolean> {
    const result = await prisma.subject.deleteMany({
      where: {
        id,
        userId
      }
    });

    return result.count > 0;
  }
}
