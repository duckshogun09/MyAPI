// Endpoint: /api/get-gamepasses?username=<username roblox>

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

    const startTime = Date.now();

    try {
        // Lấy userId từ username
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

        // Lấy danh sách gamepass
        const passesRes = await axios.get(
            `https://apis.roblox.com/game-passes/v1/users/${userId}/game-passes?count=100`
        );

        const allPasses = passesRes.data.gamePasses || [];

        // Lọc + bổ sung link
        const filteredPasses = await Promise.all(
            allPasses
                .filter(pass =>
                    pass.creator?.name?.toLowerCase() === username.toLowerCase() &&
                    pass.price !== null
                )
                .map(async (pass) => {
                    let imageUrl = null;
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
                        imageUrl = thumbRes.data.data?.[0]?.imageUrl || null;
                    } catch {}

                    return {
                        gamePassId: pass.id,
                        name: pass.name,
                        price: pass.price,
                        imageUrl,
                        url: `https://www.roblox.com/game-pass/${pass.id}`
                    };
                })
        );

        // Delay tối thiểu 5s
        const elapsed = Date.now() - startTime;
        const minDelay = 5000;
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
