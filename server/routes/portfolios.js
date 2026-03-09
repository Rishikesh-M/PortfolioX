import express from 'express';
import Portfolio from '../models/Portfolio.js';
import { MOCK_PORTFOLIOS } from '../seed/mockData.js';

const router = express.Router();

// ─── Seed helper: populate DB with mock data if empty ─────────────────────────
async function seedIfEmpty() {
    const count = await Portfolio.countDocuments();
    if (count === 0) {
        await Portfolio.insertMany(MOCK_PORTFOLIOS);
        console.log('🌱 Seeded', MOCK_PORTFOLIOS.length, 'mock portfolios');
    }
}

// Run seed on startup
seedIfEmpty().catch(console.error);

// ─── GET /api/portfolios — get all portfolios ─────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const portfolios = await Portfolio.find().sort({ createdAt: -1 }).lean();
        return res.json(portfolios);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/portfolios/:id — get single portfolio ──────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const portfolio = await Portfolio.findOne({ id: req.params.id }).lean();
        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });
        return res.json(portfolio);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/portfolios — create or upsert a portfolio ─────────────────────
router.post('/', async (req, res) => {
    try {
        const data = req.body;
        if (!data.id) return res.status(400).json({ error: 'Portfolio id is required.' });
        if (!data.fullName) return res.status(400).json({ error: 'fullName is required.' });

        const portfolio = await Portfolio.findOneAndUpdate(
            { id: data.id },
            { $set: data },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );

        return res.status(200).json(portfolio);
    } catch (err) {
        console.error('Save portfolio error:', err.message);
        return res.status(500).json({ error: err.message });
    }
});

// ─── DELETE /api/portfolios/:id ───────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const result = await Portfolio.findOneAndDelete({ id: req.params.id });
        if (!result) return res.status(404).json({ error: 'Portfolio not found.' });
        return res.json({ message: 'Portfolio deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/portfolios/:id/rate — rate a portfolio ────────────────────────
router.post('/:id/rate', async (req, res) => {
    try {
        const { userId, value } = req.body;
        if (!userId || value == null) {
            return res.status(400).json({ error: 'userId and value are required.' });
        }
        if (value < 1 || value > 5) {
            return res.status(400).json({ error: 'Rating value must be between 1 and 5.' });
        }

        // Remove existing rating from this user, then push new one
        const portfolio = await Portfolio.findOneAndUpdate(
            { id: req.params.id },
            { $pull: { ratings: { userId } } },
            { new: false }
        );

        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

        const updated = await Portfolio.findOneAndUpdate(
            { id: req.params.id },
            { $push: { ratings: { userId, value } } },
            { new: true }
        );

        return res.json(updated);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ─── POST /api/portfolios/:id/follow — toggle follow ─────────────────────────
router.post('/:id/follow', async (req, res) => {
    try {
        const { followerId } = req.body;
        if (!followerId) return res.status(400).json({ error: 'followerId is required.' });

        const portfolio = await Portfolio.findOne({ id: req.params.id });
        if (!portfolio) return res.status(404).json({ error: 'Portfolio not found.' });

        const idx = portfolio.internalFollowers.indexOf(followerId);
        if (idx === -1) {
            portfolio.internalFollowers.push(followerId);
        } else {
            portfolio.internalFollowers.splice(idx, 1);
        }

        await portfolio.save();
        return res.json(portfolio);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
