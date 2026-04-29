import { AppError } from '../../../shared/errors.js';
import { StudyRepository } from '../repository/study.repository.js';
import { StudySessionDocument, SubjectDocument } from '../schema/study.schema.js';

type StudySessionResponse = {
  id: string;
  subject: string;
  topic: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  date: string;
  notes: string;
};

type SubjectResponse = {
  id: string;
  subject: string;
  color: string;
};

const toSessionResponse = (item: StudySessionDocument): StudySessionResponse => ({
  id: item.id,
  subject: item.subject,
  topic: item.topic,
  startTime: item.startTime,
  endTime: item.endTime,
  durationMinutes: item.durationMinutes,
  date: item.sessionDate.toISOString().slice(0, 10),
  notes: item.notes
});

const toSubjectResponse = (item: SubjectDocument): SubjectResponse => ({
  id: item.id,
  subject: item.subject,
  color: item.color
});

const ensureUuid = (value: string): void => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new AppError('Invalid id format', {
      code: 'INVALID_ID',
      statusCode: 400
    });
  }
};

export class StudyService {
  constructor(private readonly repository: StudyRepository) {}

  public async ensureIndexes(): Promise<void> {
    await this.repository.ensureIndexes();
  }

  public async getSessions(
    userId: string,
    query?: {
      from?: string;
      to?: string;
      subject?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: StudySessionResponse[]; total: number }> {
    const response = await this.repository.listSessions(userId, query);
    return {
      items: response.items.map(toSessionResponse),
      total: response.total
    };
  }

  public async createSession(
    userId: string,
    payload: {
      subject: string;
      topic: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      date: string;
      notes: string;
    }
  ): Promise<StudySessionResponse> {
    const doc = await this.repository.createSession({
      userId,
      ...payload,
      subject: payload.subject.trim(),
      topic: payload.topic.trim(),
      notes: payload.notes.trim()
    });

    return toSessionResponse(doc);
  }

  public async updateSession(
    userId: string,
    id: string,
    payload: Partial<{
      subject: string;
      topic: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      date: string;
      notes: string;
    }>
  ): Promise<StudySessionResponse> {
    ensureUuid(id);

    const updated = await this.repository.updateSession(userId, id, {
      ...(payload.subject !== undefined ? { subject: payload.subject.trim() } : {}),
      ...(payload.topic !== undefined ? { topic: payload.topic.trim() } : {}),
      ...(payload.startTime !== undefined ? { startTime: payload.startTime } : {}),
      ...(payload.endTime !== undefined ? { endTime: payload.endTime } : {}),
      ...(payload.durationMinutes !== undefined ? { durationMinutes: payload.durationMinutes } : {}),
      ...(payload.date !== undefined ? { sessionDate: new Date(`${payload.date}T00:00:00.000Z`) } : {}),
      ...(payload.notes !== undefined ? { notes: payload.notes.trim() } : {})
    });

    if (!updated) {
      throw new AppError('Session not found', {
        code: 'SESSION_NOT_FOUND',
        statusCode: 404
      });
    }

    return toSessionResponse(updated);
  }

  public async deleteSession(userId: string, id: string): Promise<void> {
    ensureUuid(id);
    const deleted = await this.repository.deleteSession(userId, id);

    if (!deleted) {
      throw new AppError('Session not found', {
        code: 'SESSION_NOT_FOUND',
        statusCode: 404
      });
    }
  }

  public async getSubjects(userId: string): Promise<SubjectResponse[]> {
    const items = await this.repository.listSubjects(userId);
    return items.map(toSubjectResponse);
  }

  public async createSubject(
    userId: string,
    payload: { subject: string; color: string }
  ): Promise<SubjectResponse> {
    const doc = await this.repository.createSubject({
      userId,
      subject: payload.subject.trim(),
      color: payload.color.trim()
    });

    return toSubjectResponse(doc);
  }

  public async updateSubject(
    userId: string,
    id: string,
    payload: Partial<{ subject: string; color: string }>
  ): Promise<SubjectResponse> {
    ensureUuid(id);

    const updated = await this.repository.updateSubject(userId, id, {
      ...(payload.subject !== undefined ? { subject: payload.subject.trim() } : {}),
      ...(payload.color !== undefined ? { color: payload.color.trim() } : {})
    });

    if (!updated) {
      throw new AppError('Subject not found', {
        code: 'SUBJECT_NOT_FOUND',
        statusCode: 404
      });
    }

    return toSubjectResponse(updated);
  }

  public async deleteSubject(userId: string, id: string): Promise<void> {
    ensureUuid(id);
    const deleted = await this.repository.deleteSubject(userId, id);

    if (!deleted) {
      throw new AppError('Subject not found', {
        code: 'SUBJECT_NOT_FOUND',
        statusCode: 404
      });
    }
  }
}
