import mongoose from 'mongoose';

const newsArticleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  // Add other fields as necessary
  createdAt: { type: Date, default: Date.now },
  rewritten: { type: String } // Add this line to store the rewritten article
});

const NewsArticle = mongoose.model('NewsArticle', newsArticleSchema);

export default NewsArticle;
