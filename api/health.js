export default function handler(req, res) {
    if (req.method === 'GET') {
        return res.status(200).json({
            status: 'healthy',
            message: "Choti's Portfolio API is running!",
            endpoints: {
                chat: '/api/chat-rag',
                health: '/api/health'
            },
            timestamp: new Date().toISOString()
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}