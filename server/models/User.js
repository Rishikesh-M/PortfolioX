import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['recruiter', 'jobseeker'], required: true },
    // Recruiter extras
    company: { type: String, default: '' },
    website: { type: String, default: '' },
}, {
    timestamps: true,
    versionKey: false,
});

// Hash password before save
UserSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) return next();
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
});

// Instance method: verify password
UserSchema.methods.verifyPassword = async function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
};

// toJSON: strip passwordHash, remap _id
UserSchema.set('toJSON', {
    transform: (_, ret) => {
        ret.mongoId = ret._id;
        delete ret._id;
        delete ret.passwordHash;
        return ret;
    }
});

export default mongoose.model('User', UserSchema);
