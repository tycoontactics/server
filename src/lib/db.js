import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`DB Connection: ${conn.connection.host}`);
    } catch (error) {
        console.log(`DB connection error: `, error);
    }
};