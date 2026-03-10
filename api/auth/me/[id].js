import User from '../../_lib/User.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const { id } = req.query;

        const user = await User.findOne({ id });
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        const authUser = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            ...(user.role === 'recruiter' && { company: user.company, website: user.website }),
        };

        return res.status(200).json({ user: authUser });
    } catch (err) {
        console.error('Auth me error:', err.message);
        return res.status(500).json({ error: 'Failed to authenticate session.' });
    }
}
