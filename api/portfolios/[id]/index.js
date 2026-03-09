import { connectDB } from '../../_lib/db.js';
import Portfolio from '../../_lib/Portfolio.js';

export default async function handler(req, res) {
    try {
        await connectDB();
        const { id } = req.query;

        if (req.method === 'GET') {
            const portfolio = await Portfolio.findOne({ id });
            if (!portfolio) {
                return res.status(404).json({ error: 'Portfolio not found' });
            }
            return res.status(200).json(portfolio);
        }

        if (req.method === 'DELETE') {
            await Portfolio.findOneAndDelete({ id });
            return res.status(200).json({ message: 'Deleted successfully' });
        }

        return res.status(405).json({ error: 'Method not allowed.' });
    } catch (err) {
        console.error('Portfolio endpoint error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
