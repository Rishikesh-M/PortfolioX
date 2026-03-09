import { connectDB } from '../_lib/db.js';
import Portfolio from '../_lib/Portfolio.js';
import pkg from '../../constants.ts'; // We'll just read MOCK_PORTFOLIOS directly if needed
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    try {
        await connectDB();

        if (req.method === 'GET') {
            const portfolios = await Portfolio.find().sort({ createdAt: -1 });

            // Auto-seed logic if completely empty
            if (portfolios.length === 0) {
                // If it's totally empty we just return [] because constants is in TS and hard to import inside Vercel plain JS quickly without Babel.
                // We'll trust the user to make a portfolio themselves.
                return res.status(200).json([]);
            }

            return res.status(200).json(portfolios);
        }

        if (req.method === 'POST') {
            const data = req.body;
            data.updatedAt = new Date().toISOString();
            if (!data.createdAt) data.createdAt = data.updatedAt;

            const updated = await Portfolio.findOneAndUpdate(
                { id: data.id },
                { $set: data },
                { new: true, upsert: true }
            );
            return res.status(201).json(updated);
        }

        return res.status(405).json({ error: 'Method not allowed.' });
    } catch (err) {
        console.error('Portfolios error:', err.message);
        return res.status(500).json({ error: err.message });
    }
}
