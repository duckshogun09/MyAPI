export default async function handler(req, res) {
  // ✅ Fix CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    if (!body || !body.localStorage) {
      return res.status(400).json({ error: "Missing localStorage JSON" });
    }

    let config;
    try {
      config = JSON.parse(body.localStorage);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON: " + e.message });
    }

    const FIXED_CONFIG_ID = "8dd93fc7-27bc-35bf-b3e4-3f2000ceb746";
    const NETWORK_IDS = [
      "f08913a6-b9d5-1b79-8e49-5889cdce6980",
      "3731f6bf-b812-e983-872b-152cdab81276",
      "07fb1cda-f347-7e09-f50d-a8d894f2ffea",
      "9f1980ab-6d4b-5192-a19f-c6d4bc5d3a47",
      "b0b20248-b103-b041-3480-e90675c57a4f"
    ];
    const getRandomNetworkId = () =>
      NETWORK_IDS[Math.floor(Math.random() * NETWORK_IDS.length)];

    async function api(path, payload) {
    const r = await fetch("https://www.ugphone.com/api/" + path, {
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "accept": "application/json, text/plain, */*",
        "access-token": config["UGPHONE-Token"],
        "login-id": config["UGPHONE-ID"],
        "terminal": "web",
        "lang": config["ugPhoneLang"] || "en",
        "web-fingerprint": config["ugBrowserId"] || "default-fp",
        // các header mô phỏng browser
        "origin": "https://www.ugphone.com",
        "referer": "https://www.ugphone.com/toc-portal/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
      },
      body: JSON.stringify(payload || {}),
    });
    return r.json();
  }

    // Step 0: newPackage (bắt buộc gọi trước)
    await api("apiv1/fee/newPackage", { check: 1 });

    // Step 1: check deviceList
    const deviceList = await api("apiv1/device/deviceList", { limit: 10000 });
    if (deviceList?.data?.list?.some(
      d => d.is_free === 1 && d.pay_mode === "subscription"
    )) {
      return res.json({
        status: "has_trial",
        detail: "Already have trial device",
        deviceList
      });
    }

    // Step 2: mealList
    const meal = await api("apiv1/info/mealList", { config_id: FIXED_CONFIG_ID });
    if (!meal || meal.code !== 200) {
      return res.json({ status: "error", step: "mealList", response: meal });
    }

    // Step 3: queryResourcePrice
    const networkId = getRandomNetworkId();
    const price = await api("apiv1/fee/queryResourcePrice", {
      order_type: "newpay",
      period_time: 4,
      unit: "hour",
      resource_type: "cloudphone",
      resource_param: {
        pay_mode: "subscription",
        config_id: FIXED_CONFIG_ID,
        network_id: networkId,
        count: 1,
        use_points: 3,
        points: 250
      }
    });
    const amountId = price?.data?.amount_id;
    if (!amountId) {
      return res.json({ status: "error", step: "queryResourcePrice", response: price });
    }

    // Step 4: payment
    const pay = await api("apiv1/fee/payment", {
      amount_id: amountId,
      pay_channel: "free"
    });

    if (pay?.code === 200) {
      return res.json({ status: "success", payment: pay });
    } else if (pay?.code === 400437) {
      return res.json({
        status: "retry_later",
        message: "Frequent Request, please try later",
        payment: pay
      });
    } else {
      return res.json({ status: "failed", payment: pay });
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
