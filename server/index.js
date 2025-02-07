const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS
const corsOptions = {
  origin: [
    process.env.CORS_ORIGIN,
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Client-ID']
};

app.use(cors(corsOptions));
app.use(express.json());

// IGDB API endpoints
const IGDB_API_URL = 'https://api.igdb.com/v4';

app.post('/api/igdb/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const { query } = req.body;

    console.log('IGDB Request:', {
      endpoint,
      query,
      clientId: process.env.TWITCH_CLIENT_ID,
      accessToken: process.env.TWITCH_APP_ACCESS_TOKEN?.slice(0, 10) + '...',
    });

    // Map client-side endpoint names to IGDB API endpoints
    const endpointMap = {
      'time_to_beats': 'game_time_to_beats',
      'games': 'games',
      'screenshots': 'screenshots'
    };

    const igdbEndpoint = endpointMap[endpoint];
    if (!igdbEndpoint) {
      throw new Error(`Invalid endpoint: ${endpoint}`);
    }

    console.log('Making IGDB request to:', `${IGDB_API_URL}/${igdbEndpoint}`);
    console.log('Request headers:', {
      'Accept': 'application/json',
      'Client-ID': process.env.TWITCH_CLIENT_ID?.slice(0, 5) + '...',
      'Authorization': process.env.TWITCH_APP_ACCESS_TOKEN ? 'Bearer [hidden]' : 'Missing',
      'Content-Type': 'text/plain'
    });
    console.log('Request body:', query);

    const response = await fetch(`${IGDB_API_URL}/${igdbEndpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
        'Content-Type': 'text/plain',
      },
      body: query,
    });

    console.log('IGDB Response Status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('IGDB Error Response:', errorText);
      throw new Error(`IGDB API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying IGDB request:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
