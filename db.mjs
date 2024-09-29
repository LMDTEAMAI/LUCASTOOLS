import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    const connectionString = process.env.MONGODB_URI;
    console.log('Connection string:', connectionString.replace(/\/\/.*@/, '//<CREDENTIALS>@'));
    console.log('Mongoose version:', mongoose.version);
    
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000, // 5 seconds
      connectTimeoutMS: 10000, // 10 seconds
    });
    console.log('MongoDB connected successfully');
    
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

  } catch (error) {
    console.error('MongoDB connection error:', error);
    if (error.name === 'MongoServerSelectionError') {
      console.error('Could not connect to any servers in your MongoDB Atlas cluster. One common reason is that you\'re trying to access the database from an IP that isn\'t whitelisted.');
    }
    process.exit(1);
  }
};

export default connectDB;
