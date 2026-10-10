export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(500).json({ error: "Environment variables eksik!" });
  }

  // GET: Tüm pikselleri getir
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${url}/hgetall/pixels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      const pixels = {};
      if (data.result && Array.isArray(data.result)) {
        for (let i = 0; i < data.result.length; i += 2) {
          pixels[data.result[i]] = data.result[i + 1];
        }
      }
      return res.status(200).json(pixels);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST: Piksel kaydet
  if (req.method === 'POST') {
    const { x, y, color } = req.body;
    if (x === undefined || y === undefined || !color) {
      return res.status(400).json({ error: "Eksik veri" });
    }
    try {
      await fetch(`${url}/hset/pixels/${x},${y}/${encodeURIComponent(color)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
