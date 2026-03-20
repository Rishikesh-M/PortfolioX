/**
 * server.js — PortfolioX Local JSON Database API
 *
 * A lightweight Express backend that reads/writes db.json so that
 * user registrations and generated portfolios are persisted to disk
 * (beyond the browser's localStorage session).
 *
 * Runs on port 3001. Vite dev server proxies /api/* → http://localhost:3001
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.json');

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json({ limit: '5mb' }));

// ─── DB Helpers ───────────────────────────────────────────────────────────────
function readDb() {
    try {
        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return { users: [], portfolios: [], gstin_registry: [] };
    }
}

function writeDb(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
});

// ── Users ─────────────────────────────────────────────────────────────────────

/** GET /api/users — return all users (passwords redacted) */
app.get('/api/users', (_req, res) => {
    const db = readDb();
    const safe = (db.users || []).map(({ password, ...rest }) => rest);
    res.json(safe);
});

/** POST /api/users — save / update a user record (called after registration) */
app.post('/api/users', (req, res) => {
    const incoming = req.body;
    if (!incoming || !incoming.id || !incoming.email) {
        return res.status(400).json({ error: 'id and email are required' });
    }

    const db = readDb();
    const users = db.users || [];
    const idx = users.findIndex(u => u.id === incoming.id);

    if (idx >= 0) {
        // Update existing (merge, never overwrite password hash stored in localStorage)
        users[idx] = { ...users[idx], ...incoming, updatedAt: new Date().toISOString() };
    } else {
        users.push({ ...incoming, createdAt: new Date().toISOString() });
    }

    db.users = users;
    writeDb(db);
    res.json({ ok: true, user: { ...incoming, password: undefined } });
});

/** DELETE /api/users/:id */
app.delete('/api/users/:id', (req, res) => {
    const db = readDb();
    db.users = (db.users || []).filter(u => u.id !== req.params.id);
    writeDb(db);
    res.json({ ok: true });
});

// ── Portfolios ────────────────────────────────────────────────────────────────

/** GET /api/portfolios — all portfolios */
app.get('/api/portfolios', (_req, res) => {
    const db = readDb();
    res.json(db.portfolios || []);
});

/** GET /api/portfolios/:id */
app.get('/api/portfolios/:id', (req, res) => {
    const db = readDb();
    const p = (db.portfolios || []).find(p => p.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Portfolio not found' });
    res.json(p);
});

/** POST /api/portfolios — create or update a portfolio */
app.post('/api/portfolios', (req, res) => {
    const incoming = req.body;
    if (!incoming || !incoming.id) {
        return res.status(400).json({ error: 'Portfolio id is required' });
    }

    const db = readDb();
    const portfolios = db.portfolios || [];
    const idx = portfolios.findIndex(p => p.id === incoming.id);

    if (idx >= 0) {
        portfolios[idx] = { ...portfolios[idx], ...incoming, updatedAt: new Date().toISOString() };
    } else {
        portfolios.push({ ...incoming, createdAt: new Date().toISOString() });
    }

    db.portfolios = portfolios;
    writeDb(db);
    res.json({ ok: true, portfolio: incoming });
});

/** DELETE /api/portfolios/:id */
app.delete('/api/portfolios/:id', (req, res) => {
    const db = readDb();
    db.portfolios = (db.portfolios || []).filter(p => p.id !== req.params.id);
    writeDb(db);
    res.json({ ok: true });
});

// ── GSTIN Registry (read-only from server, managed in db.json directly) ───────
app.get('/api/gstin/:gstin', (req, res) => {
    const db = readDb();
    const registry = db.gstin_registry || [];
    const match = registry.find(
        e => e.gstin?.toUpperCase() === req.params.gstin.toUpperCase()
    );
    if (!match) return res.json({ found: false });
    res.json({ found: true, ...match });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[server] Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`\n🗄️  PortfolioX DB Server running at http://localhost:${PORT}`);
    console.log(`   Writing data to: ${DB_PATH}\n`);
});
