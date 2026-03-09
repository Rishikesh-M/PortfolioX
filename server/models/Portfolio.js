import mongoose from 'mongoose';

const RatingSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    value: { type: Number, required: true, min: 1, max: 5 },
}, { _id: false });

const ProjectSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, default: '' },
    url: { type: String, default: '' },
}, { _id: false });

const SkillSchema = new mongoose.Schema({
    name: String,
    category: String,
}, { _id: false });

const LearningProgressSchema = new mongoose.Schema({
    label: { type: String, required: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const PortfolioStatsSchema = new mongoose.Schema({
    repos: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
}, { _id: false });

const ContactSchema = new mongoose.Schema({
    email: { type: String, default: '' },
    twitter: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    website: { type: String, default: '' },
}, { _id: false });

const QuizStatsSchema = new mongoose.Schema({
    level: { type: Number, default: 1 },
    points: { type: Number, default: 0 },
    maxLevel: { type: Number, default: 15 },
}, { _id: false });

const PortfolioSchema = new mongoose.Schema({
    // `id` is the string ID used in the frontend (e.g. from Gemini or manual)
    id: { type: String, required: true, unique: true, index: true },
    // userId links to the AuthUser who owns this portfolio
    userId: { type: String, index: true },
    fullName: { type: String, required: true, trim: true },
    role: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    domain: { type: String, default: 'Full Stack' },
    stats: { type: PortfolioStatsSchema, default: () => ({}) },
    skills: { type: [String], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    githubProjects: { type: [ProjectSchema], default: [] },
    learningProgress: { type: [LearningProgressSchema], default: [] },
    createdAt: { type: String, default: () => new Date().toISOString() },
    score: { type: Number, default: 0, min: 0, max: 100 },
    grade: { type: String, enum: ['S', 'A', 'B', 'C', 'D'], default: 'C' },
    internalFollowers: { type: [String], default: [] },
    ratings: { type: [RatingSchema], default: [] },
    contact: { type: ContactSchema, default: () => ({}) },
    quizStats: { type: QuizStatsSchema, default: null },
}, {
    timestamps: true, // adds createdAt/updatedAt mongo fields
    versionKey: false,
});

// Virtual average rating
PortfolioSchema.virtual('averageRating').get(function () {
    if (!this.ratings || this.ratings.length === 0) return 0;
    const sum = this.ratings.reduce((acc, r) => acc + r.value, 0);
    return +(sum / this.ratings.length).toFixed(2);
});

// toJSON: include virtuals, map _id → mongoId (keep our custom `id`)
PortfolioSchema.set('toJSON', {
    virtuals: true,
    transform: (_, ret) => {
        ret.mongoId = ret._id;
        delete ret._id;
        return ret;
    }
});

export default mongoose.model('Portfolio', PortfolioSchema);
