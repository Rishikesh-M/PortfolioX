import Portfolio from '../../_lib/Portfolio.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const { id } = req.query;
        const { followerId } = req.body;

        if (!followerId) {
            return res.status(400).json({ error: 'followerId is required.' });
        }

        const portfolio = await Portfolio.findOne({ id });
        if (!portfolio) {
            return res.status(404).json({ error: 'Portfolio not found.' });
        }

        if (!portfolio.internalFollowers) portfolio.internalFollowers = [];

        const idx = portfolio.internalFollowers.indexOf(followerId);
        if (idx !== -1) {
            portfolio.internalFollowers.splice(idx, 1);
        } else {
            portfolio.internalFollowers.push(followerId);
        }

        await portfolio.save();
        return res.status(200).json(portfolio);

    } catch (err) {
        console.error('Follow endpoint error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
