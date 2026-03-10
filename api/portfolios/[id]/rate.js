import Portfolio from '../../_lib/Portfolio.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const { id } = req.query;
        const { userId, value } = req.body;

        if (!userId || value === undefined) {
            return res.status(400).json({ error: 'userId and value are required.' });
        }

        const portfolio = await Portfolio.findOne({ id });
        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found.' });
        }

        if (!portfolio.ratings) portfolio.ratings = [];

        const idx = portfolio.ratings.findIndex(r => r.userId === userId);
        if (idx !== -1) {
            portfolio.ratings[idx].value = value;
        } else {
            portfolio.ratings.push({ userId, value });
        }

        await portfolio.save();
        return res.status(200).json(portfolio);

    } catch (err) {
        console.error('Rate endpoint error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
