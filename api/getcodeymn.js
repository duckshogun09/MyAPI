export default async function handler(req, res) {
  const { type } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Thiếu tham số type' });
  }

  const targetUrl = 'https://ymn.kingcrtis1.workers.dev/bypass?type=' + encodeURIComponent(type);

  try {
    const response = await fetch(targetUrl);
    const data = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(data);

  } catch (e) {
    return res.status(500).json({ error: 'Không kết nối được server nguồn' });
  }
}
