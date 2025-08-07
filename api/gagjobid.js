export default async function handler(req, res) {
  const PLACE_ID = '126884695634066';
  const API_URL = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?sortOrder=Asc&limit=100`;

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch server data from Roblox' });
    }

    const data = await response.json();

    const ids = data.data.map(server => server.id);

    return res.status(200).json(ids);
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
