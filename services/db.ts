/**
 * db.ts — Frontend API client for PortfolioX MongoDB backend.
 *
 * Uses relative /api URLs which work in both environments:
 *   • Local dev  → Vite proxy forwards /api → http://localhost:5000
 *   • Vercel     → /api/* is handled by serverless functions (same domain)
 */

import { UserPortfolio, AuthUser } from '../types.ts';
import { MOCK_PORTFOLIOS } from '../constants.ts';

const API_BASE = '/api';

class ApiError extends Error {
  status?: number;
  isNetworkError?: boolean;
  constructor(message: string, opts: { status?: number; isNetworkError?: boolean } = {}) {
    super(message);
    this.status = opts.status;
    this.isNetworkError = opts.isNetworkError;
  }
}

async function apiGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`);
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection.', { isNetworkError: true });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed (${res.status})`, { status: res.status });
  }
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection.', { isNetworkError: true });
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiError(errBody.error || `Request failed (${res.status})`, { status: res.status });
  }
  return res.json();
}

async function apiDelete<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  } catch {
    throw new ApiError('Cannot reach the server. Please check your connection.', { isNetworkError: true });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error || `Request failed (${res.status})`, { status: res.status });
  }
  return res.json();
}

const LS_KEY = 'portfoliox_portfolios';

function lsGetPortfolios(): UserPortfolio[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : MOCK_PORTFOLIOS;
  } catch {
    return MOCK_PORTFOLIOS;
  }
}

function lsSavePortfolios(arr: UserPortfolio[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(arr));
}

export const db = {
  async getPortfolios(): Promise<UserPortfolio[]> {
    try {
      const data = await apiGet<UserPortfolio[]>('/portfolios');
      lsSavePortfolios(data);
      return data;
    } catch (err) {
      console.warn('⚠️  API unreachable, using localStorage fallback:', err);
      return lsGetPortfolios();
    }
  },

  async savePortfolio(portfolio: UserPortfolio): Promise<void> {
    try {
      await apiPost('/portfolios', portfolio);
    } catch (err) {
      console.warn('⚠️  API save failed, using localStorage fallback:', err);
    }
    const cached = lsGetPortfolios();
    const idx = cached.findIndex(p => p.id === portfolio.id);
    if (idx !== -1) cached[idx] = portfolio;
    else cached.unshift(portfolio);
    lsSavePortfolios(cached);
  },

  async deletePortfolio(id: string): Promise<void> {
    try {
      await apiDelete(`/portfolios/${id}`);
    } catch (err) {
      console.warn('⚠️  API delete failed, using localStorage fallback:', err);
    }
    const cached = lsGetPortfolios().filter(p => p.id !== id);
    lsSavePortfolios(cached);
  },

  async ratePortfolio(portfolioId: string, userId: string, value: number): Promise<UserPortfolio | null> {
    try {
      const updated = await apiPost<UserPortfolio>(`/portfolios/${portfolioId}/rate`, { userId, value });
      const cached = lsGetPortfolios();
      const idx = cached.findIndex(p => p.id === portfolioId);
      if (idx !== -1) { cached[idx] = updated; lsSavePortfolios(cached); }
      return updated;
    } catch (err) {
      const cached = lsGetPortfolios();
      const portfolio = cached.find(p => p.id === portfolioId);
      if (portfolio) {
        if (!portfolio.ratings) portfolio.ratings = [];
        const ri = portfolio.ratings.findIndex(r => r.userId === userId);
        if (ri !== -1) portfolio.ratings[ri].value = value;
        else portfolio.ratings.push({ userId, value });
        lsSavePortfolios(cached);
        return portfolio;
      }
      return null;
    }
  },

  async toggleFollow(portfolioId: string, followerId: string): Promise<UserPortfolio | null> {
    try {
      const updated = await apiPost<UserPortfolio>(`/portfolios/${portfolioId}/follow`, { followerId });
      const cached = lsGetPortfolios();
      const idx = cached.findIndex(p => p.id === portfolioId);
      if (idx !== -1) { cached[idx] = updated; lsSavePortfolios(cached); }
      return updated;
    } catch (err) {
      const cached = lsGetPortfolios();
      const portfolio = cached.find(p => p.id === portfolioId);
      if (portfolio) {
        if (!portfolio.internalFollowers) portfolio.internalFollowers = [];
        const idx2 = portfolio.internalFollowers.indexOf(followerId);
        if (idx2 === -1) portfolio.internalFollowers.push(followerId);
        else portfolio.internalFollowers.splice(idx2, 1);
        lsSavePortfolios(cached);
        return portfolio;
      }
      return null;
    }
  },

  async register(payload: {
    fullName: string;
    email: string;
    password: string;
    role: string;
    company?: string;
    website?: string;
  }): Promise<AuthUser> {
    const data = await apiPost<{ user: AuthUser }>('/auth/register', payload);
    return data.user;
  },

  async login(payload: { email: string; password: string; role?: string }): Promise<AuthUser> {
    const data = await apiPost<{ user: AuthUser }>('/auth/login', payload);
    return data.user;
  },

  async validateSession(id: string): Promise<AuthUser | null> {
    try {
      const data = await apiGet<{ user: AuthUser }>(`/auth/me/${id}`);
      return data.user;
    } catch (err) {
      if (err instanceof ApiError && err.isNetworkError) {
        throw err;
      }
      return null;
    }
  },
};
