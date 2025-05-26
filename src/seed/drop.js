import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';

const run = async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();
  console.log('Database dropped');
  process.exit();
};
run();
