/**
 * db.ts — Pure Frontend Database for PortfolioX.
 *
 * This version uses localStorage for persistence, removing the need for a backend API.
 * It simulates a database by storing 'users' and 'portfolios' in the browser.
 */

import { UserPortfolio, AuthUser } from '../types.ts';
import { MOCK_PORTFOLIOS } from '../constants.ts';
import bcrypt from 'bcryptjs';

const USERS_KEY = 'portfoliox_users';
const PORTFOLIOS_KEY = 'portfoliox_portfolios';

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
  localStorage.setItem(key, JSON.stringify(data));
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
}

// Call init once
initDb();

export const db = {
  // --- Portfolio Operations ---

  async getPortfolios(): Promise<UserPortfolio[]> {
    // Artificial delay to feel like a real DB
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
  }): Promise<AuthUser> {
    const users = getFromLS<any[]>(USERS_KEY, []);

    if (users.find(u => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new Error('An account with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(payload.password, salt);

    const newUser = {
      id: `user_${Date.now()}`,
      ...payload,
      passwordHash
    };

    users.push(newUser);
    saveToLS(USERS_KEY, users);

    // Return safe AuthUser shape
    return {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role as any,
      company: newUser.company,
      website: newUser.website
    };
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
      website: user.website
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
      website: user.website
    };
  },
};
