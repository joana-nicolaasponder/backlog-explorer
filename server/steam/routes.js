const express = require('express');
const { fetchAndEnrichSteamGames, addGamesToLibrary } = require('./service');

const router = express.Router();

// GET /api/steam/games/:steamId
router.get('/games/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const games = await fetchAndEnrichSteamGames(steamId);
    res.json(games);
  } catch (error) {
    console.error('Error fetching Steam games:', error.message);
    res.status(500).json({ error: 'Failed to fetch Steam games' });
  }
});

// POST /api/steam/add-games
router.post('/add-games', async (req, res) => {
  const { userId, games } = req.body;
  try {
    const result = await addGamesToLibrary(userId, games);
    res.json(result);
  } catch (error) {
    console.error('Error adding games to library:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/steam/verify-openid
router.post('/verify-openid', async (req, res) => {
  try {
    const params = req.body.openidResponse;
    if (!params['openid.claimed_id']) {
      return res.status(400).json({ error: 'Missing OpenID parameters' });
    }
    const matches = params['openid.claimed_id'].match(/\/id\/(7[0-9]{15,25})/);
    if (!matches) {
      return res.status(400).json({ error: 'Could not extract Steam ID' });
    }
    const steamId = matches[1];
    const STEAM_API_URL = 'https://api.steampowered.com';
    const axios = require('axios');
    const steamUserResponse = await axios.get(
      `${STEAM_API_URL}/ISteamUser/GetPlayerSummaries/v2/`,
      {
        params: {
          key: process.env.STEAM_API_KEY,
          steamids: steamId,
        },
      }
    );
    if (!steamUserResponse.data.response.players.length) {
      return res.status(404).json({ error: 'Steam user not found' });
    }
    const userData = steamUserResponse.data.response.players[0];
    res.json({
      steamId: userData.steamid,
      nickname: userData.personaname,
      avatar: userData.avatarfull,
      profileUrl: userData.profileurl,
    });
  } catch (error) {
    console.error('Error in verify-openid:', error.message);
    res.status(500).json({ error: 'Failed to verify Steam OpenID response' });
  }
});

module.exports = router;
