import User from '../_lib/User.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {

        const { email, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'No account found with this email. Please register first.' });
        }

        if (role && user.role !== role) {
            return res.status(403).json({
                error: `This account is registered as a ${user.role}, not ${role}.`,
            });
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
}
