import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';

const router = express.Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
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
            passwordHash: password, // pre-save hook will hash it
            role,
            company: company || '',
            website: website || '',
        });

        // Return the safe AuthUser shape
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
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'No account found with this email. Please register first.' });
        }

        // Optionally verify role matches
        if (role && user.role !== role) {
            return res.status(403).json({ error: `This account is registered as a ${user.role}, not ${role}.` });
        }

        const isMatch = await user.verifyPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const authUser = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            ...(user.role === 'recruiter' && { company: user.company, website: user.website }),
        };

        return res.status(200).json({ user: authUser, message: 'Logged in successfully!' });
    } catch (err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ─── GET /api/auth/me  (check if user exists by id) ──────────────────────────
router.get('/me/:id', async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.id });
        if (!user) return res.status(404).json({ error: 'User not found.' });

        const authUser = {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            ...(user.role === 'recruiter' && { company: user.company, website: user.website }),
        };

        return res.json({ user: authUser });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
