import bcrypt from 'bcryptjs';
import { readDb, writeDb } from './jsonDb.js';

const User = {
    async findOne({ email, id }) {
        const db = await readDb();
        if (email) {
            const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            if (user) return this.enrichUser(user);
        }
        if (id) {
            const user = db.users.find(u => u.id === id);
            if (user) return this.enrichUser(user);
        }
        return null;
    },

    async create(userData) {
        const db = await readDb();

        // Hash password before saving
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(userData.passwordHash, salt);

        const newUser = {
            ...userData,
            passwordHash,
            id: userData.id || `user_${Date.now()}`
        };

        db.users.push(newUser);
        await writeDb(db);
        return this.enrichUser(newUser);
    },

    enrichUser(user) {
        return {
            ...user,
            verifyPassword: async (candidatePassword) => {
                return await bcrypt.compare(candidatePassword, user.passwordHash);
            }
        };
    }
};

export default User;
