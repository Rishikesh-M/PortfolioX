
export type UserRole = 'recruiter' | 'jobseeker';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  // Recruiter-specific extras
  company?: string;
  website?: string;
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
  GENERATOR = 'generator',
  PORTFOLIO = 'portfolio',
  DISCOVER = 'discover',
  AUTH = 'auth',
  EDITOR = 'editor',
  QUIZ = 'quiz',
  RECRUITER = 'recruiter',
  JOB_SEEKER = 'jobseeker'
}

export type SortOption = 'newest' | 'name' | 'popularity' | 'best' | 'quiz_points';
export type DomainFilter = 'All' | 'Frontend' | 'Backend' | 'Full Stack' | 'Security' | 'AI/ML';
