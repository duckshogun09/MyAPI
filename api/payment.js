import fetch from "node-fetch";
import HttpsProxyAgent from "https-proxy-agent";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, access-token, login-id, web-fingerprint");

  if (req.method === "OPTIONS") {
    // Trả về luôn cho preflight request
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const PROXY = "http://vpn615658214.opengw.net:1428";
    const agent = new HttpsProxyAgent(PROXY);

    const response = await fetch("https://www.ugphone.com/api/apiv1/fee/payment", {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "accept": "application/json, text/plain, */*",
        "access-token": req.headers["access-token"],
        "login-id": req.headers["login-id"],
        "terminal": "web",
        "lang": "en",
        "web-fingerprint": req.headers["web-fingerprint"] || "default-fp"
      },
      body: JSON.stringify(body),
      agent
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
