import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright'; // Replace puppeteer with playwright
import User from './models/User.mjs';
import connectDB from './db.mjs';
import { validateUser } from './middleware/validate.mjs';
import { auth } from './middleware/auth.mjs';
import { errorHandler } from './middleware/errorHandler.mjs';
import OpenAI from 'openai';
import NewsArticle from './models/NewsArticle.mjs';
import RSSParser from 'rss-parser';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize OpenAI client directly with the API key
const openai = new OpenAI(process.env.OPENAI_API_KEY);

// Serve static files from the "public" directory
app.use(express.static('public'));

app.use(express.json());

// Route to fetch, rewrite, and store news articles
app.get('/api/fetch-news', async (req, res) => {
    try {
        const rssParser = new RSSParser();
        const rssUrl = 'https://www.news.com.au/content-feeds/latest-news-world/'; // Replace with your RSS feed URL

        // Log the RSS URL being fetched
        console.log(`Fetching RSS feed from URL: ${rssUrl}`);

        const feed = await rssParser.parseURL(rssUrl);

        // Check if the feed has items
        if (!feed.items || feed.items.length === 0) {
            throw new Error('No articles found in the RSS feed.');
        }

        // Assume you want to rewrite the first article
        const firstArticle = feed.items[0];
        const articleUrl = firstArticle.link;

        // Use Playwright to fetch the full article content
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
        await page.goto(articleUrl, { waitUntil: 'networkidle' });

        // Wait for the article content to load
        await page.waitForSelector('.article-content');

        // Extract the full article content
        const articleHtml = await page.content();
        await browser.close();

        // Log the fetched HTML content for debugging
        console.log(`Fetched HTML content: ${articleHtml}`);

        const $ = cheerio.load(articleHtml);
        const fullArticleContent = $('.article-content').text(); // Adjust the selector as needed

        // Log the extracted full article content
        console.log(`Extracted full article content: ${fullArticleContent}`);

        if (!fullArticleContent) {
            throw new Error('Failed to extract full article content.');
        }

        const rewritePrompt = `Rewrite the following news article in the style of Macho Man Randy Savage:\n\n${fullArticleContent}`;

        // Use axios to call the OpenAI API directly with the correct endpoint
        const openaiResponse = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: rewritePrompt }],
            max_tokens: 1024
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const rewrittenArticle = openaiResponse.data.choices[0].message.content;

        // Store the original and rewritten articles in MongoDB
        await NewsArticle.create({
            title: firstArticle.title,
            description: fullArticleContent,
            rewritten: rewrittenArticle
        });

        res.status(200).json({ original: fullArticleContent, rewritten: rewrittenArticle });
    } catch (error) {
        console.error('Error fetching and rewriting news articles:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route to generate a random GPT prompt
app.get('/api/generate-prompt', async (req, res) => {
    try {
        const prompt = `Generate a random and creative GPT prompt that could be used for a variety of tasks, such as storytelling, problem-solving, or generating creative content. The prompt should be engaging, open-ended, and suitable for a wide range of audiences.`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 1.0,
                max_tokens: 100,
            }),
        });

        if (!openaiResponse.ok) {
            throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
        }

        const openaiData = await openaiResponse.json();
        const generatedPrompt = openaiData.choices[0].message.content.trim();

        res.json({ prompt: generatedPrompt });
    } catch (error) {
        console.error('Error generating random GPT prompt:', error);
        res.status(500).json({ error: 'Failed to generate random GPT prompt', details: error.message });
    }
});

// Connect to MongoDB before starting the server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });

// Add this route to serve the database.html file
app.get('/database', (req, res) => {
    res.sendFile('database.html', { root: './public' });
});

// Protected route example
app.get('/api/protected', auth, (req, res) => {
    res.json({ message: 'This is a protected route' });
});

// New image generation endpoint
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt, quality, style } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await axios.post('https://api.openai.com/v1/images/generations', {
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            model: "dall-e-3",
            quality: quality || "standard",
            style: style || "vivid"
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        const imageUrl = response.data.data[0].url;
        res.json({ imageUrl });
    } catch (error) {
        console.error('Error generating image:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

// New user endpoint
app.post('/api/users', validateUser, async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(400).json({ message: error.message });
    }
});

// New user list endpoint with pagination, sorting, and searching
app.get('/api/users', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = req.query.sort || 'createdAt';
        const order = req.query.order === 'asc' ? 1 : -1;
        const search = req.query.search || '';
        const field = req.query.field || 'all';

        let query = {};

        if (search) {
            if (field === 'all') {
                query = {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { email: { $regex: search, $options: 'i' } },
                        { nationality: { $regex: search, $options: 'i' } },
                        { occupation: { $regex: search, $options: 'i' } },
                        { education: { $regex: search, $options: 'i' } },
                        { hobbies: { $regex: search, $options: 'i' } },
                        { favoriteColor: { $regex: search, $options: 'i' } }
                    ]
                };
            } else if (['height', 'weight', 'age'].includes(field)) {
                query[field] = parseInt(search);
            } else {
                query[field] = { $regex: search, $options: 'i' };
            }
        }

        const users = await User.find(query)
            .sort({ [sort]: order })
            .skip((page - 1) * limit)
            .limit(limit);

        const total = await User.countDocuments(query);

        res.json({
            users,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalUsers: total
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get a single user
app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update a user
app.put('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Existing chat completion endpoint
app.post('/api/openai', async (req, res) => {
    try {
        if (!req.body.message) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: req.body.message }],
            }),
        });

        if (!openaiResponse.ok) {
            throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
        }

        const openaiData = await openaiResponse.json();
        res.json({ result: openaiData.choices[0].message.content });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add this route to serve the user-gallery.html file
app.get('/user-gallery', (req, res) => {
    res.sendFile('user-gallery.html', { root: './public' });
});

// Replace the video generation endpoint with an image generation endpoint
app.post('/api/generate-video', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024"
        });

        const imageUrl = response.data[0].url;
        res.json({ imageUrl });
    } catch (error) {
        console.error('Error generating image:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

// Add this route to serve the video-generator.html file
app.get('/video-generator', (req, res) => {
    res.sendFile('video-generator.html', { root: './public' });
});

// Add this new endpoint
app.get('/api/generate-random-user', async (req, res) => {
    try {
        const prompt = `Generate random user data in JSON format with the following fields: name, email, height (in cm), weight (in kg), age, nationality, occupation, education, hobbies (as an array), favoriteColor, and gender (Male, Female, Other, or Prefer not to say). Please ensure the following:

        1. ALL fields must be randomly generated with diverse and realistic data.
        2. For occupation, be extremely creative and varied. Avoid common jobs like software engineer, teacher, or doctor. Instead, use a wide range of unique and interesting occupations from various industries, skill levels, and even some unconventional or futuristic jobs. Examples: "Vertical Farm Architect", "Quantum Computing Ethicist", "Augmented Reality Experience Designer", "Space Debris Removal Specialist", "Nostalgic Experience Curator", "Autonomous Vehicle Personality Designer", etc.
        3. Nationalities should be diverse and from all continents, including some less commonly represented countries.
        4. Hobbies should be unique and interesting, not just common activities. Include both modern and traditional hobbies.
        5. Education levels should vary from no formal education to advanced degrees, including alternative forms of education.
        6. Ages should range from 18 to 100.
        7. Heights and weights should be realistic but varied.
        8. Favorite colors should include both common and uncommon color choices, possibly even made-up color names.
        9. Ensure a good mix of genders, including 'Other' and 'Prefer not to say' options.

        Respond ONLY with the JSON object and nothing else.`;

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: prompt }],
                temperature: 1.0,
                max_tokens: 500,
            }),
        });

        if (!openaiResponse.ok) {
            throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
        }

        const openaiData = await openaiResponse.json();
        const generatedContent = openaiData.choices[0].message.content.trim();

        let generatedUserData;
        try {
            // Try to parse the entire response
            generatedUserData = JSON.parse(generatedContent);
        } catch (parseError) {
            // If parsing fails, try to extract the JSON portion
            const jsonMatch = generatedContent.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
                try {
                    generatedUserData = JSON.parse(jsonMatch[0]);
                } catch (innerParseError) {
                    console.error('Error parsing extracted JSON:', innerParseError);
                    console.error('Extracted content:', jsonMatch[0]);
                    throw new Error('Failed to parse extracted JSON from the response');
                }
            } else {
                console.error('No valid JSON found in the response');
                console.error('Generated content:', generatedContent);
                throw new Error('No valid JSON found in the response');
            }
        }

        // Ensure all fields are present and have the correct type
        const requiredFields = {
            name: String,
            email: String,
            height: Number,
            weight: Number,
            age: Number,
            nationality: String,
            occupation: String,
            education: String,
            hobbies: Array,
            favoriteColor: String,
            gender: String
        };

        Object.entries(requiredFields).forEach(([field, type]) => {
            if (!(field in generatedUserData) || typeof generatedUserData[field] !== type.name.toLowerCase()) {
                if (type === Array) {
                    generatedUserData[field] = [];
                } else if (type === Number) {
                    generatedUserData[field] = 0;
                } else {
                    generatedUserData[field] = '';
                }
            }
        });

        // Ensure hobbies is an array of strings
        if (!Array.isArray(generatedUserData.hobbies)) {
            generatedUserData.hobbies = generatedUserData.hobbies ? [String(generatedUserData.hobbies)] : [];
        } else {
            generatedUserData.hobbies = generatedUserData.hobbies.map(String);
        }

        res.json(generatedUserData);
    } catch (error) {
        console.error('Error generating random user data:', error);
        res.status(500).json({ error: 'Failed to generate random user data', details: error.message });
    }
});

// Move the error handler middleware to the very end
app.use(errorHandler);