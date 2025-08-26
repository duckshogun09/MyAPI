export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { type, keyword, ids } = req.query;

  try {
    let apiUrl = "";

    if (type === "search" && keyword) {
      apiUrl = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(keyword)}&limit=100`;
    } 
    else if (type === "avatar" && ids) {
      apiUrl = `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=100x100&format=Png&isCircular=true`;
    } 
    else {
      return res.status(400).json({ error: "Thiếu tham số type/keyword/ids" });
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
