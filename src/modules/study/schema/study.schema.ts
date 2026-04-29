export type StudySessionDocument = {
  id: string;
  userId: string;
  subject: string;
  topic: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  sessionDate: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SubjectDocument = {
  id: string;
  userId: string;
  subject: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
};
