const fetch = require('node-fetch')

const IGDB_API_URL = 'https://api.igdb.com/v4'

const endpointMap = {
  time_to_beats: 'game_time_to_beats',
  games: 'games',
  screenshots: 'screenshots',
}

async function proxyIGDBRequest(endpoint, query) {
  const igdbEndpoint = endpointMap[endpoint]
  if (!igdbEndpoint) {
    throw new Error(`Invalid endpoint: ${endpoint}`)
  }

  const response = await fetch(`${IGDB_API_URL}/${igdbEndpoint}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: query,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('IGDB API error:', response.statusText)
    throw new Error(`IGDB API error: ${response.statusText}`)
  }

  return response.json()
}

async function searchGameByName(name) {
  const response = await fetch(`${IGDB_API_URL}/games`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${process.env.TWITCH_APP_ACCESS_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: `search "${name}"; fields id,name,summary,cover.url; limit 1;`,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IGDB search error:', response.statusText);
    return [];
  }

  return response.json();
}

module.exports = { proxyIGDBRequest, searchGameByName };

