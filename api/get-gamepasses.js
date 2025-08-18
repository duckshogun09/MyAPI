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
        // 🔹 Lấy thông tin user
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

        // 🔹 Lấy danh sách gamepasses
        const passesRes = await axios.get(
            `https://apis.roblox.com/game-passes/v1/users/${userId}/game-passes?count=100`
        );

        const allPasses = passesRes.data.gamePasses || [];

        // 🔹 Lọc pass hợp lệ (creator trùng username + có giá)
        const validPasses = allPasses.filter(pass =>
            pass.creator?.name?.toLowerCase() === username.toLowerCase() &&
            pass.price !== null
        );

        // 🔹 Gom tất cả iconAssetId để gọi thumbnails 1 lần
        const iconIds = validPasses.map(p => p.iconAssetId).filter(Boolean);

        let thumbsMap = {};
        if (iconIds.length > 0) {
            const thumbRes = await axios.get(`https://thumbnails.roblox.com/v1/assets`, {
                params: {
                    assetIds: iconIds.join(","), // gọi 1 lần nhiều id
                    size: '150x150',
                    format: 'Png',
                    type: 'Asset'
                }
            });

            // Tạo map assetId -> imageUrl
            thumbsMap = (thumbRes.data.data || []).reduce((acc, item) => {
                acc[item.targetId] = item.imageUrl;
                return acc;
            }, {});
        }

        // 🔹 Kết quả cuối cùng
        const result = validPasses.map(pass => ({
            gamePassId: pass.gamePassId,
            url: `https://www.roblox.com/game-pass/${pass.gamePassId}`,
            iconAssetId: pass.iconAssetId,
            name: pass.name,
            price: pass.price,
            imageUrl: thumbsMap[pass.iconAssetId] || null
        }));

        // Delay tối thiểu 5 giây (nếu cần)
        const elapsed = Date.now() - startTime;
        const minDelay = 5000;
        if (elapsed < minDelay) {
            await new Promise(resolve => setTimeout(resolve, minDelay - elapsed));
        }

        res.status(200).json(result);

    } catch (err) {
        res.status(500).json({
            error: 'Đã xảy ra lỗi khi xử lý',
            detail: err.response?.data || err.message
        });
    }
};
