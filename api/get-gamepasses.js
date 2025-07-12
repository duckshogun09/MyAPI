const axios = require('axios');

// Hàm delay
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
        // 1. Lấy thông tin user từ username
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

        // 2. Lấy tất cả gamepass qua phân trang
        let allPasses = [];
        let nextCursor = null;
        do {
            const url = `https://apis.roblox.com/game-passes/v1/users/${userId}/game-passes?count=100${nextCursor ? `&cursor=${nextCursor}` : ''}`;
            const response = await axios.get(url);

            const gamePasses = response.data.gamePasses || [];
            allPasses.push(...gamePasses);

            nextCursor = response.data.nextPageCursor;

            // Đợi 800ms giữa mỗi trang để tránh rate limit
            await sleep(800);
        } while (nextCursor);

        // 3. Lọc gamepass của chính người dùng
        const filtered = allPasses.filter(pass => pass.creator?.id === userId);

        // 4. Lấy tất cả iconAssetId
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
            } catch {
                thumbData = [];
            }
        }

        // 5. Gắn thumbnail vào từng gamepass
        const filteredPasses = filtered.map(pass => {
            const thumb = thumbData.find(t => t.assetId === pass.iconAssetId);
            return {
                iconAssetId: pass.iconAssetId,
                name: pass.name,
                price: pass.price,
                imageUrl: thumb?.imageUrl || null
            };
        });

        // ✅ Chờ 10 giây trước khi trả kết quả
        await sleep(10000);

        // 6. Trả kết quả JSON
        res.status(200).json(filteredPasses);

    } catch (err) {
        res.status(500).json({
            error: 'Đã xảy ra lỗi khi xử lý',
            detail: err.response?.data || err.message
        });
    }
};
