import 'dotenv/config';
import express from 'express';
import fetch from 'node-fetch';
import path from 'path';

const app = express();
const port = 3000;

// Serve static files from the "public" directory
app.use(express.static('public'));

app.use(express.json());

app.post('/api/openai', async (req, res) => {
    const messages = req.body.messages;
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4', // Specify the model
                messages: messages,
                max_tokens: 150
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred. Please try again.' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
