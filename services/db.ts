/**
 * db.ts — Pure Frontend Database for PortfolioX.
 *
 * This version uses localStorage for persistence, removing the need for a backend API.
 * It simulates a database by storing 'users', 'portfolios', 'conversations', and 'quizQuestions' in the browser.
 */

import { UserPortfolio, AuthUser, RecruiterQuizQuestion, CandidateQuizResponse, Conversation, Message } from '../types.ts';
import { MOCK_PORTFOLIOS } from '../constants.ts';
import bcrypt from 'bcryptjs';
import dbSeedData from '../db.json';

const USERS_KEY = 'portfoliox_users';
const PORTFOLIOS_KEY = 'portfoliox_portfolios';
const CONVERSATIONS_KEY = 'portfoliox_conversations';
const QUIZ_QUESTIONS_KEY = 'portfoliox_quiz_questions';
const QUIZ_RESPONSES_KEY = 'portfoliox_quiz_responses';

// --- Internal Helpers ---

function getFromLS<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToLS(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    if (e.name === 'QuotaExceededError') {
      console.warn(`localStorage quota exceeded for key: ${key}. Data is synced to backend db.json instead.`);
      // Optionally, we could clear less-important keys here, but failing gracefully is fine since we sync to Express.
    } else {
      console.error('Error saving to localStorage:', e);
    }
  }
}

// Initialize logic: ensure we have mock data if nothing exists
function initDb() {
  const portfolios = localStorage.getItem(PORTFOLIOS_KEY);
  if (!portfolios) {
    saveToLS(PORTFOLIOS_KEY, MOCK_PORTFOLIOS);
  }

  const users = localStorage.getItem(USERS_KEY);
  if (!users) {
    saveToLS(USERS_KEY, []);
  }

  if (!localStorage.getItem(CONVERSATIONS_KEY)) {
    saveToLS(CONVERSATIONS_KEY, []);
  }

  if (!localStorage.getItem(QUIZ_QUESTIONS_KEY)) {
    saveToLS(QUIZ_QUESTIONS_KEY, []);
  }

  if (!localStorage.getItem(QUIZ_RESPONSES_KEY)) {
    saveToLS(QUIZ_RESPONSES_KEY, []);
  }
}

// Call init once
initDb();

// ─── GSTIN Validation & Registry Lookup ────────────────────────────────────
// GSTIN format: 2 digit state code + 10 char PAN + 1 entity number + Z + 1 checksum
export function validateGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin.toUpperCase());
}

export interface GSTINLookupResult {
  /** 'registered'  — found in our local registry (pre-verified companies)
   *  'format-valid' — correct 15-char format but not in registry
   *  'invalid'      — fails regex check */
  status: 'registered' | 'format-valid' | 'invalid';
  gstin: string;
  legalName?: string;
  tradeName?: string;
  state?: string;
  businessType?: string;
  registrationDate?: string;
  gstStatus?: string; // 'Active' | 'Inactive' etc.
}

/**
 * Looks up a GSTIN against:
 *  1. The local registry in db.json  → status: 'registered'
 *  2. Format validation              → status: 'format-valid'
 *  3. If neither passes              → status: 'invalid'
 */
export function lookupGSTIN(gstin: string): GSTINLookupResult {
  const upper = gstin.trim().toUpperCase();

  // 1. Registry lookup (db.json gstin_registry)
  const registry = (dbSeedData as any).gstin_registry as any[];
  if (Array.isArray(registry)) {
    const found = registry.find(
      (entry: any) => entry.gstin?.toUpperCase() === upper
    );
    if (found) {
      return {
        status: 'registered',
        gstin: upper,
        legalName: found.legalName,
        tradeName: found.tradeName,
        state: found.state,
        businessType: found.businessType,
        registrationDate: found.registrationDate,
        gstStatus: found.status,
      };
    }
  }

  // 2. Format validation
  if (validateGSTIN(upper)) {
    return { status: 'format-valid', gstin: upper };
  }

  // 3. Invalid
  return { status: 'invalid', gstin: upper };
}

export const db = {
  // --- Portfolio Operations ---

  async getPortfolios(): Promise<UserPortfolio[]> {
    try {
      const res = await fetch('/api/portfolios');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) return data;
      }
    } catch (e) {
      console.warn('Failed to fetch portfolios from backend API, falling back to localStorage', e);
    }

    // Artificial delay for fallback
    await new Promise(r => setTimeout(r, 200));
    return getFromLS<UserPortfolio[]>(PORTFOLIOS_KEY, MOCK_PORTFOLIOS);
  },

  async savePortfolio(portfolio: UserPortfolio): Promise<void> {
    const portfolios = getFromLS<UserPortfolio[]>(PORTFOLIOS_KEY, MOCK_PORTFOLIOS);
    const idx = portfolios.findIndex(p => p.id === portfolio.id);

    if (idx !== -1) {
      portfolios[idx] = { ...portfolio, updatedAt: new Date().toISOString() } as UserPortfolio;
    } else {
      portfolios.unshift({ ...portfolio, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } as UserPortfolio);
    }

    saveToLS(PORTFOLIOS_KEY, portfolios);

    // Sync to backend db.json asynchronously (fire and forget)
    fetch('/api/portfolios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolios[idx !== -1 ? idx : 0])
    }).catch(err => console.error('Failed to sync portfolio to API:', err));
  },

  async deletePortfolio(id: string): Promise<void> {
    const portfolios = getFromLS<UserPortfolio[]>(PORTFOLIOS_KEY, MOCK_PORTFOLIOS);
    const filtered = portfolios.filter(p => p.id !== id);
    saveToLS(PORTFOLIOS_KEY, filtered);
  },

  async ratePortfolio(portfolioId: string, userId: string, value: number): Promise<UserPortfolio | null> {
    const portfolios = getFromLS<UserPortfolio[]>(PORTFOLIOS_KEY, MOCK_PORTFOLIOS);
    const portfolio = portfolios.find(p => p.id === portfolioId);

    if (portfolio) {
      if (!portfolio.ratings) portfolio.ratings = [];
      const ri = portfolio.ratings.findIndex(r => r.userId === userId);
      if (ri !== -1) {
        portfolio.ratings[ri].value = value;
      } else {
        portfolio.ratings.push({ userId, value });
      }
      saveToLS(PORTFOLIOS_KEY, portfolios);
      return portfolio;
    }
    return null;
  },

  async toggleFollow(portfolioId: string, followerId: string): Promise<UserPortfolio | null> {
    const portfolios = getFromLS<UserPortfolio[]>(PORTFOLIOS_KEY, MOCK_PORTFOLIOS);
    const portfolio = portfolios.find(p => p.id === portfolioId);

    if (portfolio) {
      if (!portfolio.internalFollowers) portfolio.internalFollowers = [];
      const idx = portfolio.internalFollowers.indexOf(followerId);
      if (idx === -1) {
        portfolio.internalFollowers.push(followerId);
      } else {
        portfolio.internalFollowers.splice(idx, 1);
      }
      saveToLS(PORTFOLIOS_KEY, portfolios);
      return portfolio;
    }
    return null;
  },

  // --- Auth Operations ---

  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    role: string;
    company?: string;
    website?: string;
    gstin?: string;
  }): Promise<AuthUser> {
    const users = getFromLS<any[]>(USERS_KEY, []);

    if (users.find(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    // Validate GSTIN for recruiters
    if (payload.role === 'recruiter') {
      if (!payload.gstin) {
        throw new Error('GSTIN is required for recruiter registration.');
      }
      if (!validateGSTIN(payload.gstin)) {
        throw new Error('Invalid GSTIN format. Please enter a valid 15-character GSTIN.');
      }
      // Check GSTIN uniqueness
      if (users.find(u => u.gstin && u.gstin.toUpperCase() === payload.gstin!.toUpperCase())) {
        throw new Error('This GSTIN is already registered with another account.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password, salt);

    const newUser = {
      id: `user_${Date.now()}`,
      ...payload,
      gstin: payload.gstin?.toUpperCase(),
      passwordHash
    };

    users.push(newUser);
    saveToLS(USERS_KEY, users);

    const safeUser = {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role as any,
      company: newUser.company,
      website: newUser.website,
      gstin: newUser.gstin,
    };

    // Sync to backend db.json asynchronously (fire and forget)
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(safeUser)
    }).catch(err => console.error('Failed to sync user to API:', err));

    // Return safe AuthUser shape
    return safeUser;
  },

  async login(payload: { email: string; password: string; role?: string }): Promise<AuthUser> {
    const users = getFromLS<any[]>(USERS_KEY, []);
    const user = users.find(u => u.email.toLowerCase() === payload.email.toLowerCase());

    if (!user) {
      throw new Error('No account found with this email.');
    }

    if (payload.role && user.role !== payload.role) {
      throw new Error(`This account is registered as a ${user.role}, not ${payload.role}.`);
    }

    const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Invalid email or password.');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      company: user.company,
      website: user.website,
      gstin: user.gstin,
    };
  },

  async validateSession(id: string): Promise<AuthUser | null> {
    const users = getFromLS<any[]>(USERS_KEY, []);
    const user = users.find(u => u.id === id);
    if (!user) return null;

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      company: user.company,
      website: user.website,
      gstin: user.gstin,
    };
  },

  // --- Recruiter Quiz Question Operations ---

  async saveQuizQuestion(question: RecruiterQuizQuestion): Promise<void> {
    const questions = getFromLS<RecruiterQuizQuestion[]>(QUIZ_QUESTIONS_KEY, []);
    const idx = questions.findIndex(q => q.id === question.id);
    if (idx !== -1) {
      questions[idx] = question;
    } else {
      questions.unshift(question);
    }
    saveToLS(QUIZ_QUESTIONS_KEY, questions);
  },

  async getQuizQuestionsByRecruiter(recruiterId: string): Promise<RecruiterQuizQuestion[]> {
    const questions = getFromLS<RecruiterQuizQuestion[]>(QUIZ_QUESTIONS_KEY, []);
    return questions.filter(q => q.recruiterId === recruiterId);
  },

  async deleteQuizQuestion(id: string): Promise<void> {
    const questions = getFromLS<RecruiterQuizQuestion[]>(QUIZ_QUESTIONS_KEY, []);
    saveToLS(QUIZ_QUESTIONS_KEY, questions.filter(q => q.id !== id));
  },

  async saveQuizResponse(response: CandidateQuizResponse): Promise<void> {
    const responses = getFromLS<CandidateQuizResponse[]>(QUIZ_RESPONSES_KEY, []);
    const idx = responses.findIndex(r => r.id === response.id);
    if (idx !== -1) {
      responses[idx] = response;
    } else {
      responses.unshift(response);
    }
    saveToLS(QUIZ_RESPONSES_KEY, responses);
  },

  async getQuizResponsesByRecruiter(recruiterId: string): Promise<CandidateQuizResponse[]> {
    const responses = getFromLS<CandidateQuizResponse[]>(QUIZ_RESPONSES_KEY, []);
    return responses.filter(r => r.recruiterId === recruiterId);
  },

  async getQuizResponsesByCandidate(candidatePortfolioId: string): Promise<CandidateQuizResponse[]> {
    const responses = getFromLS<CandidateQuizResponse[]>(QUIZ_RESPONSES_KEY, []);
    return responses.filter(r => r.candidatePortfolioId === candidatePortfolioId);
  },

  // --- Conversation / Messaging Operations ---

  async getConversations(): Promise<Conversation[]> {
    return getFromLS<Conversation[]>(CONVERSATIONS_KEY, []);
  },

  async getConversationsByRecruiter(recruiterId: string): Promise<Conversation[]> {
    const convs = getFromLS<Conversation[]>(CONVERSATIONS_KEY, []);
    return convs.filter(c => c.recruiterId === recruiterId).sort((a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  },

  async getConversationsByCandidate(candidatePortfolioId: string): Promise<Conversation[]> {
    const convs = getFromLS<Conversation[]>(CONVERSATIONS_KEY, []);
    return convs.filter(c => c.candidatePortfolioId === candidatePortfolioId).sort((a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
  },

  async getOrCreateConversation(
    recruiterId: string,
    recruiterName: string,
    recruiterCompany: string | undefined,
    candidatePortfolioId: string,
    candidateName: string,
    subject?: string
  ): Promise<Conversation> {
    const convs = getFromLS<Conversation[]>(CONVERSATIONS_KEY, []);
    let conv = convs.find(c => c.recruiterId === recruiterId && c.candidatePortfolioId === candidatePortfolioId);
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        recruiterId,
        recruiterName,
        recruiterCompany,
        candidatePortfolioId,
        candidateName,
        messages: [],
        lastMessageAt: new Date().toISOString(),
        subject,
      };
      convs.unshift(conv);
      saveToLS(CONVERSATIONS_KEY, convs);
    }
    return conv;
  },

  async sendMessage(conversationId: string, message: Omit<Message, 'id' | 'conversationId'>): Promise<Message> {
    const convs = getFromLS<Conversation[]>(CONVERSATIONS_KEY, []);
    const convIdx = convs.findIndex(c => c.id === conversationId);
    if (convIdx === -1) throw new Error('Conversation not found');

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      conversationId,
      ...message,
    };

    convs[convIdx].messages.push(newMsg);
    convs[convIdx].lastMessageAt = newMsg.sentAt;
    saveToLS(CONVERSATIONS_KEY, convs);
    return newMsg;
  },

  async markMessagesRead(conversationId: string, readerId: string): Promise<void> {
    const convs = getFromLS<Conversation[]>(CONVERSATIONS_KEY, []);
    const convIdx = convs.findIndex(c => c.id === conversationId);
    if (convIdx === -1) return;
    convs[convIdx].messages = convs[convIdx].messages.map(m =>
      m.senderId !== readerId ? { ...m, read: true } : m
    );
    saveToLS(CONVERSATIONS_KEY, convs);
  },

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const convs = getFromLS<Conversation[]>(CONVERSATIONS_KEY, []);
    const conv = convs.find(c => c.id === conversationId);
    if (!conv) return 0;
    return conv.messages.filter(m => m.senderId !== userId && !m.read).length;
  },
};
