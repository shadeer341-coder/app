

export type UserRole = string;
export type UserLevel = 'UG' | 'PG';

export type User = {
  id: string;
  name: string;
  email: string;
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
  sort_order: number;
};

export type QuestionLevel = string;

export type Question = {
  id: number;
  text: string;
  category_id: number;
  level: QuestionLevel;
  created_at: string;
  tags?: string[];
  audio_url?: string;
  read_time_seconds?: number;
  answer_time_seconds?: number;
  question_categories: { name: string }; // For joining data
};

export type InterviewSessionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type InterviewSession = {
    id: string;
    user_id: string;
    overall_score?: number;
    summary?: any; // JSONB
    created_at: string;
    status: InterviewSessionStatus;
    visual_feedback?: any;
};

export type InterviewAttempt = {
  id: string;
  user_id: string;
  session_id: string;
  question_id: number;
  transcript: string;
  snapshots: string[];
  feedback?: any; // JSONB
  score?: number;
  created_at: string;
  questions?: { // For joining data
    text: string;
    tags: string[];
    question_categories: { name: string };
  };
};

export type Agency = {
  id: string;
  name: string;
  members: User[];
};
