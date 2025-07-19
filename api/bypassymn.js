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
    res.status(200).send(data);

  } catch (error) {
    res.status(500).json({ error: 'Không thể kết nối server nguồn.' });
  }
}
