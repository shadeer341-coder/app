


export type UserRole = string;
export type UserLevel = 'UG' | 'PG';

export type User = {
  id: string;
  name: string;
  email: string; // This will come from the auth session, not the profile table
  avatarUrl: string;
  role: UserRole;
  level: UserLevel;
  agencyId?: string;
  onboardingCompleted: boolean;
  gender?: string;
  age?: number;
  nationality?: string;
  program?: string;
  university?: string;
  lastEducation?: string;
};

export type QuestionCategory = {
  id: number;
  name: string;
  question_limit: number;
  created_at: string;
};

export type QuestionLevel = string;

export type Question = {
  id: number;
  text: string;
  category_id: number;
  level: QuestionLevel;
  created_at: string;
  question_categories: { name: string }; // For joining data
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

    