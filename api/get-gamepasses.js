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

        // Lọc gamepass do chính user này tạo (so sánh bằng ID)
        const filtered = allPasses.filter(pass => pass.creator?.id === userId);

        // Gộp toàn bộ assetId
        const assetIds = filtered.map(pass => pass.iconAssetId).filter(Boolean);
        let thumbData = [];

        if (assetIds.length > 0) {
            try {
                const thumbRes = await axios.get('https://thumbnails.roblox.com/v1/assets', {
                    params: {
                        assetIds: assetIds.join(','),
                        size: '150x150',
                        format: 'Png',
                        type: 'Asset'
                    }
                });
                thumbData = thumbRes.data.data || [];
            } catch (thumbErr) {
                // Nếu lỗi thumbnail thì để imageUrl null
                thumbData = [];
            }
        }

        // Gắn thumbnail vào từng pass
        const filteredPasses = filtered.map(pass => {
            const thumb = thumbData.find(t => t.assetId === pass.iconAssetId);
            return {
                iconAssetId: pass.iconAssetId,
                name: pass.name,
                price: pass.price,
                imageUrl: thumb?.imageUrl || null
            };
        });

        res.status(200).json(filteredPasses);

    } catch (err) {
        res.status(500).json({
            error: 'Đã xảy ra lỗi khi xử lý',
            detail: err.response?.data || err.message
        });
    }
};
