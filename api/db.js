import mongoose from 'mongoose';

export const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error(
            '❌ MONGODB_URI is not defined in .env.local\n' +
            '   Add: MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/portfoliox'
        );
    }

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`   Database: ${conn.connection.name}`);
        return conn;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        throw error;
    }
};
