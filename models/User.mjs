import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  height: {
    type: Number,
    min: 0,
    max: 300 // in cm
  },
  weight: {
    type: Number,
    min: 0,
    max: 500 // in kg
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  nationality: {
    type: String,
    trim: true
  },
  occupation: {
    type: String,
    trim: true
  },
  education: {
    type: String,
    trim: true
  },
  hobbies: {
    type: [String],
    default: []
  },
  favoriteColor: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

export default User;
