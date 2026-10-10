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
    return res.status(500).json({ error: "Veritabanı bağlantı bilgileri eksik (Environment Variables kontrol et)." });
  }

  // Pikselleri Veritabanından Çek (GET)
  if (req.method === 'GET') {
    try {
      const response = await fetch(`${url}/hgetall/pixels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const result = data.result || [];
      const pixels = {};
      for (let i = 0; i < result.length; i += 2) {
        pixels[result[i]] = result[i + 1];
      }
      return res.status(200).json(pixels);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Yeni Pikseli Veritabanına Kaydet (POST)
  if (req.method === 'POST') {
    const { x, y, color } = req.body;
    if (x === undefined || y === undefined || !color) {
      return res.status(400).json({ error: "Eksik parametre" });
    }
    try {
      await fetch(`${url}/hset/pixels/${x},${y}/${encodeURIComponent(color)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.status(200).json({ success: true, x, y, color });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
