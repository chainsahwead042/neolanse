export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { creators, userId } = req.body;

        if (!creators || !userId) {
            return res.status(400).json({ error: 'Creators and userId required' });
        }

        // For now, just return success
        res.status(200).json({
            success: true,
            message: 'Export completed'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
}