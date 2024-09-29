import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import axios from 'axios'; // Add this line
import User from './models/User.mjs';
import connectDB from './db.mjs';

console.log('MONGODB_URI:', process.env.MONGODB_URI);

const app = express();
const port = 3000;

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
app.post('/api/users', async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = new User({ name, email });
        await user.save();
        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// New user list endpoint
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Connect to MongoDB before starting the server
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
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
