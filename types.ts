
export type UserRole = 'recruiter' | 'jobseeker';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  // Recruiter-specific extras
  company?: string;
  website?: string;
  gstin?: string; // GST Identification Number for recruiters
}

export interface Project {
  id: string;
  name: string;
  description: string;
  type: string;
  url?: string;
}

export interface Skill {
  name: string;
  category: string;
}

export interface LearningProgress {
  label: string;
  percentage: number;
}

export interface PortfolioStats {
  repos: number;
  followers: number;
  projectsCount: number;
}

export interface UserPortfolio {
  id: string;
  userId?: string; // Links portfolio to an authenticated user
  fullName: string;
  role: string;
  bio: string;
  avatar: string;
  stats: PortfolioStats;
  skills: string[];
  projects: Project[];
  githubProjects: Project[];
  learningProgress: LearningProgress[];
  domain: string;
  createdAt: string;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  internalFollowers: string[];
  ratings: { userId: string; value: number }[];
  contact?: {
    email?: string;
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  quizStats?: {
    level: number;
    points: number;
    maxLevel?: number;
  };
  updatedAt?: string;
}

export enum AppView {
  LANDING = 'landing',
  GENERATOR = 'generator',
  PORTFOLIO = 'portfolio',
  DISCOVER = 'discover',
  AUTH = 'auth',
  EDITOR = 'editor',
  QUIZ = 'quiz',
  RECRUITER = 'recruiter',
  JOB_SEEKER = 'jobseeker',
  MESSAGES = 'messages',
}

// ─── Recruiter Quiz Types ───────────────────────────────────────────────────
export interface RecruiterQuizQuestion {
  id: string;
  recruiterId: string;
  jobTitle: string; // Context: which job this quiz is for
  question: string;
  options: string[];
  correctAnswer: number; // index of correct option
  points: number;
  createdAt: string;
}

export interface CandidateQuizResponse {
  id: string;
  quizQuestionId: string;
  recruiterId: string;
  candidatePortfolioId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  score: number;
  submittedAt: string;
}

// ─── Messaging Types ────────────────────────────────────────────────────────
export interface Message {
  id: string;
  conversationId: string;
  senderId: string; // user id
  senderName: string;
  senderRole: UserRole;
  content: string;
  sentAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  recruiterId: string;
  recruiterName: string;
  recruiterCompany?: string;
  candidatePortfolioId: string;
  candidateName: string;
  messages: Message[];
  lastMessageAt: string;
  subject?: string;
}

export type SortOption = 'newest' | 'name' | 'popularity' | 'best' | 'quiz_points';
export type DomainFilter = 'All' | 'Frontend' | 'Backend' | 'Full Stack' | 'Security' | 'AI/ML';
