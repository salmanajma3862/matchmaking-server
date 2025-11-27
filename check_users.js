import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import User from './src/models/User.js';

dotenv.config();

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await User.countDocuments();
        fs.writeFileSync('user_count.txt', `User count: ${count}`);
        console.log(`User count: ${count}`);
        process.exit(0);
    } catch (error) {
        fs.writeFileSync('user_count.txt', `Error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
};

checkUsers();
