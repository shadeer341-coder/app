import type { User, Agency, QuestionCategory, Question, InterviewAttempt, UserLevel } from './types';

export const users: User[] = [
  { id: 'user-1', name: 'Alex Johnson', email: 'alex@example.com', avatarUrl: 'https://picsum.photos/seed/u1/100/100', role: 'user', level: 'PG' },
  { id: 'user-2', name: 'Maria Garcia', email: 'maria@example.com', avatarUrl: 'https://picsum.photos/seed/u2/100/100', role: 'agency_admin', level: 'PG', agencyId: 'agency-1' },
  { id: 'user-3', name: 'Chen Wei', email: 'chen@example.com', avatarUrl: 'https://picsum.photos/seed/u3/100/100', role: 'admin', level: 'PG' },
  { id: 'user-4', name: 'Ben Carter', email: 'ben@agency.com', avatarUrl: 'https://picsum.photos/seed/u4/100/100', role: 'user', level: 'UG', agencyId: 'agency-1' },
];

export const agencies: Agency[] = [
  { 
    id: 'agency-1', 
    name: 'Innovate Talent Agency',
    members: [users[1], users[3]]
  },
];

export const questionCategories: QuestionCategory[] = [
    { id: 'cat-1', name: 'Behavioral' },
    { id: 'cat-2', name: 'Technical - Frontend' },
    { id: 'cat-3', name: 'Technical - Backend' },
    { id: 'cat-4', name: 'System Design' },
];

export const questions: Question[] = [
  { id: 'q-1', text: 'Tell me about a time you had to handle a conflict with a coworker.', category: questionCategories[0], level: 'Both', isMandatory: true },
  { id: 'q-2', text: 'Explain the difference between `let`, `const`, and `var` in JavaScript.', category: questionCategories[1], level: 'UG', isMandatory: false },
  { id: 'q-3', text: 'How would you design a database schema for a simple e-commerce site?', category: questionCategories[2], level: 'PG', isMandatory: false },
  { id: 'q-4', text: 'Design a URL shortening service like TinyURL.', category: questionCategories[3], level: 'PG', isMandatory: false },
];

export const interviewAttempts: InterviewAttempt[] = [
  {
    id: 'attempt-1',
    userId: 'user-1',
    question: questions[0],
    score: 85,
    createdAt: '2024-05-20T10:00:00Z',
    feedback: {
      strengths: 'Clear communication and structured response using the STAR method.',
      weaknesses: 'Could provide more detail on the final resolution and outcome.',
      grammarFeedback: 'Grammar was excellent with no noticeable errors.',
      overallPerformance: 'A strong performance. The candidate demonstrated good conflict resolution skills.',
    },
  },
  {
    id: 'attempt-2',
    userId: 'user-1',
    question: questions[1],
    score: 72,
    createdAt: '2024-05-22T14:30:00Z',
    feedback: {
        strengths: 'Correctly identified the block-scoping of let and const.',
        weaknesses: 'A bit hesitant when explaining hoisting in relation to `var`.',
        grammarFeedback: 'Mostly correct, with a few filler words like "um" and "like".',
        overallPerformance: 'A good attempt. The core concepts were understood, but could be explained with more confidence.',
    }
  },
  {
    id: 'attempt-3',
    userId: 'user-4',
    question: questions[0],
    score: 65,
    createdAt: '2024-05-21T09:00:00Z',
    feedback: {
        strengths: 'Willingness to tackle a difficult question.',
        weaknesses: 'Response was unstructured and lacked a clear example.',
        grammarFeedback: 'Grammar was a bit informal for an interview setting.',
        overallPerformance: 'Needs improvement. Focusing on the STAR method would be highly beneficial for behavioral questions.',
    }
  },
];
