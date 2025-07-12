const axios = require('axios');

module.exports = async (req, res) => {
    // ⚠️ Bật CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Xử lý preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ error: 'Thiếu username' });
    }

    // Ghi lại thời gian bắt đầu
    const startTime = Date.now();

    try {
        const userResponse = await axios.post(
            'https://users.roblox.com/v1/usernames/users',
            {
                usernames: [username],
                excludeBannedUsers: true
            },
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const userData = userResponse.data.data[0];
        if (!userData) {
            return res.status(404).json({ error: 'Không tìm thấy người dùng Roblox' });
        }

        const userId = userData.id;

        const passesRes = await axios.get(
            `https://apis.roblox.com/game-passes/v1/users/${userId}/game-passes?count=100`
        );

        const allPasses = passesRes.data.gamePasses || [];

        const filteredPasses = await Promise.all(
            allPasses
                .filter(pass =>
                    pass.creator?.name?.toLowerCase() === username.toLowerCase() &&
                    pass.price !== null // Chỉ lấy pass có price khác null
                )
                .map(async (pass) => {
                    try {
                        const thumbRes = await axios.get(
                            `https://thumbnails.roblox.com/v1/assets`,
                            {
                                params: {
                                    assetIds: pass.iconAssetId,
                                    size: '150x150',
                                    format: 'Png',
                                    type: 'Asset'
                                }
                            }
                        );

                        const imageUrl = thumbRes.data.data?.[0]?.imageUrl || null;

                        return {
                            iconAssetId: pass.iconAssetId,
                            name: pass.name,
                            price: pass.price,
                            imageUrl
                        };
                    } catch {
                        return {
                            iconAssetId: pass.iconAssetId,
                            name: pass.name,
                            price: pass.price,
                            imageUrl: null
                        };
                    }
                })
        );

        // Tính thời gian đã xử lý
        const elapsed = Date.now() - startTime;
        const minDelay = 10000; // 10s = 10000ms

        // Nếu xử lý xong mà chưa đủ 10s thì delay thêm cho đủ
        if (elapsed < minDelay) {
            await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }

        res.status(200).json(filteredPasses);

    } catch (err) {
        res.status(500).json({
            error: 'Đã xảy ra lỗi khi xử lý',
            detail: err.response?.data || err.message
        });
    }
};
