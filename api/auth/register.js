import User from '../_lib/User.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        const { fullName, email, password, role, company, website } = req.body;

        if (!fullName || !email || !password || !role) {
            return res.status(400).json({ error: 'fullName, email, password, and role are required.' });
        }
        if (!['recruiter', 'jobseeker'].includes(role)) {
            return res.status(400).json({ error: 'role must be "recruiter" or "jobseeker".' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const exists = await User.findOne({ email: email.toLowerCase() });
        if (exists) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        const user = await User.create({
            id: uuidv4(),
            fullName,
            email,
            passwordHash: password,
            role,
            company: company || '',
            website: website || '',
        });

        const authUser = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            ...(user.role === 'recruiter' && { company: user.company, website: user.website }),
        };

        return res.status(201).json({ user: authUser, message: 'Account created successfully!' });
    } catch (err) {
        console.error('Register error:', err.message);
        return res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
}
