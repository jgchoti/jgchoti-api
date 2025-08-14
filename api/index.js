export default function handler(req, res) {
    return res.status(200).json({
        message: "Welcome to Choti's Portfolio API! 🤖",
        description: "RAG-powered chatbot API for portfolio inquiries",
        endpoints: {
            chat: "/api/chat-rag - POST - Chat with Choti's AI agent",
            health: "/api/health - GET - Health check"
        },
        usage: {
            method: "POST",
            url: "/api/chat-rag",
            body: {
                message: "Your question here",
                conversationHistory: "Optional previous messages"
            }
        },
        portfolio: "https://jgchoti.github.io",
        github: "https://github.com/jgchoti"
    });
}