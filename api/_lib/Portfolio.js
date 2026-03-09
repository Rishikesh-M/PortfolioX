import mongoose from 'mongoose';

const UserPortfolioSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true }, // Changed from user_id to userId to match TS struct
    theme: { type: String, required: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    bio: { type: String, required: true },
    avatarUrl: { type: String, required: true },
    location: { type: String },

    // Contact Info
    contact: {
        email: { type: String },
        website: { type: String },
        twitter: { type: String },
        linkedin: { type: String },
    },

    skills: [String],
    projects: [{
        id: { type: String },
        title: { type: String },
        description: { type: String },
        technologies: [String],
        link: { type: String },
        githubLink: { type: String },
        imageUrl: { type: String },
    }],
    experience: [{
        id: { type: String },
        role: { type: String },
        company: { type: String },
        startDate: { type: String },
        endDate: { type: String },
        description: { type: String },
    }],
    education: [{
        id: { type: String },
        degree: { type: String },
        institution: { type: String },
        year: { type: String },
    }],

    // Interaction data
    ratings: [{
        userId: { type: String },
        value: { type: Number },
    }],
    internalFollowers: [String],

    createdAt: { type: String },
    updatedAt: { type: String },

    // Game / Platform logic
    role: { type: String },
    quizPoints: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },
    level: { type: Number, default: 1 }
});

export default mongoose.models.Portfolio || mongoose.model('Portfolio', UserPortfolioSchema);
