import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios'; // Add this line
import User from './models/User.mjs';
import connectDB from './db.mjs';
import { validateUser } from './middleware/validate.mjs';
import { auth } from './middleware/auth.mjs'; // Add this line
import { errorHandler } from './middleware/errorHandler.mjs';

// Remove this line as it's not needed anymore
// console.log('MONGODB_URI:', process.env.MONGODB_URI);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static('public'));

app.use(express.json());

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

// New image generation endpoint
app.post('/api/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const response = await axios.post('https://api.openai.com/v1/images/generations', {
            prompt: prompt,
            n: 1,
            size: "1024x1024"
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

        const query = search
            ? { $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
              ]}
            : {};

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

// Move the error handler middleware to the very end
app.use(errorHandler);