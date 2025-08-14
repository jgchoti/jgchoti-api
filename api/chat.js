const rateLimitStore = new Map();

const RATE_LIMIT = {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    maxTokensPerHour: 10000,
};

setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitStore.entries()) {
        if (now - data.windowStart > RATE_LIMIT.windowMs) {
            rateLimitStore.delete(ip);
        }
    }
}, 5 * 60 * 1000);

function getRateLimitData(ip) {
    const now = Date.now();
    let data = rateLimitStore.get(ip);

    if (!data || (now - data.windowStart > RATE_LIMIT.windowMs)) {
        data = {
            windowStart: now,
            requests: 0,
            tokensUsed: 0
        };
        rateLimitStore.set(ip, data);
    }

    return data;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;


    const rateLimitData = getRateLimitData(userIP);

    if (rateLimitData.requests >= RATE_LIMIT.maxRequests) {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((RATE_LIMIT.windowMs - (Date.now() - rateLimitData.windowStart)) / 1000)
        });
    }

    if (rateLimitData.tokensUsed >= RATE_LIMIT.maxTokensPerHour) {
        return res.status(429).json({
            error: 'Token limit exceeded for this hour',
            retryAfter: Math.ceil((RATE_LIMIT.windowMs - (Date.now() - rateLimitData.windowStart)) / 1000)
        });
    }

    let requestedTokens = 0;
    try {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const { messages, model = 'gpt-3.5-turbo', max_tokens = 400, temperature = 0.8 } = req.body;


        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages format' });
        }

        if (messages.length > 50) {
            return res.status(400).json({
                error: 'Too many messages in conversation, Maybe write an email?'
            });
        }

        const totalChars = messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
        if (totalChars > 50000) {
            return res.status(400).json({ error: 'Messages too long, Maybe write an email?' });
        }

        const limitedMaxTokens = Math.min(max_tokens, 2000);
        requestedTokens = limitedMaxTokens;

        rateLimitData.requests++;
        rateLimitData.tokensUsed += limitedMaxTokens;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: limitedMaxTokens,
                temperature: Math.min(Math.max(temperature, 0), 2),
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API error:', errorData);

            rateLimitData.tokensUsed -= limitedMaxTokens;

            return res.status(response.status).json({
                error: 'OpenAI API error',
                details: errorData.error?.message || 'Unknown error'
            });
        }

        const data = await response.json();

        // Update actual token usage if available
        if (data.usage?.total_tokens) {
            rateLimitData.tokensUsed = rateLimitData.tokensUsed - limitedMaxTokens + data.usage.total_tokens;
        }


        console.log(`Request from ${userIP}: ${data.usage?.total_tokens || 'unknown'} tokens`);

        res.status(200).json(data);

    } catch (error) {
        console.error('Server error:', error);

        const rateLimitData = getRateLimitData(userIP);
        rateLimitData.requests = Math.max(0, rateLimitData.requests - 1);
        if (typeof requestedTokens === 'number' && !Number.isNaN(requestedTokens)) {
            rateLimitData.tokensUsed = Math.max(0, rateLimitData.tokensUsed - requestedTokens);
        }

        return res.status(500).json({ error: 'Internal server error' });
    }
}