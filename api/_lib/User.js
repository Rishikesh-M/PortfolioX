import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true }, // will store hashed password
    role: { type: String, enum: ['recruiter', 'jobseeker'], required: true },
    company: { type: String },
    website: { type: String },
});

// Middleware to hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to verify password
UserSchema.methods.verifyPassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
};

export default mongoose.models.User || mongoose.model('User', UserSchema);
