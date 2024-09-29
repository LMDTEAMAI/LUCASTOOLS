import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  height: { type: Number },
  weight: { type: Number },
  age: { type: Number },
  nationality: { type: String },
  occupation: { type: String },
  education: { type: String },
  hobbies: [String],
  favoriteColor: { type: String },
  gender: { type: String }, // Add this line
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

export default User;
