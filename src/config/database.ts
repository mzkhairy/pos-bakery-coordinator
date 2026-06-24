import mongoose from 'mongoose';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  try {
    await mongoose.connect(uri);
    console.log('[Coordinator DB] Connected to MongoDB');
  } catch (error) {
    console.error('[Coordinator DB] Connection failed:', error);
    process.exit(1);
  }
}
