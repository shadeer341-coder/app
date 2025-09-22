export type UserRole = 'user' | 'agency_admin' | 'admin';
export type UserLevel = 'UG' | 'PG';

export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  level: UserLevel;
  agencyId?: string;
};

export type QuestionCategory = {
  id: string;
  name: string;
};

export type Question = {
  id: string;
  text: string;
  category: QuestionCategory;
  level: 'UG' | 'PG' | 'Both';
  isMandatory: boolean;
};

export type InterviewAttempt = {
  id: string;
  userId: string;
  question: Question;
  score: number;
  videoUrl?: string;
  feedback?: {
    strengths: string;
    weaknesses: string;
    grammarFeedback: string;
    overallPerformance: string;
  };
  createdAt: string;
};

export type Agency = {
  id: string;
  name: string;
  members: User[];
};
