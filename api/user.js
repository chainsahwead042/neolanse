export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID required' });
        }

        // For now, return free user status
        res.status(200).json({
            searchesLeft: 10,
            isPro: false
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
}