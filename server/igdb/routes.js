const express = require('express');
const { proxyIGDBRequest } = require('./service');

const router = express.Router();

// POST /api/igdb/:endpoint
router.post('/:endpoint', async (req, res) => {
  try {
    const { endpoint } = req.params;
    const { query } = req.body;
    const data = await proxyIGDBRequest(endpoint, query);
    res.json(data);
  } catch (error) {
    console.error('Error proxying IGDB request:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;