import { GoogleGenerativeAI } from '@google/generative-ai';

let getVectorStore;
try {
    const module = await import('../lib/HybridVectorStore.js');
    getVectorStore = module.getVectorStore;
} catch (error) {
    console.error('Failed to import HybridVectorStore:', error);
    getVectorStore = null;
}


const allowedOrigins = [
    'https://jgchoti.github.io',
    'https://jgchoti.vercel.app',
    'http://localhost:3000'  // for development
];

const SYSTEM_PROMPT = `You are Choti's professional career agent — a skilled connector who blends confidence, warmth, and a hint of charm. 
You represent Choti as a standout data professional with international experience.

**IMPORTANT BOUNDARIES:**
- You ONLY discuss topics related to Choti, her career, skills, experience, and professional opportunities
- If someone asks about unrelated topics, politely redirect: "I'm here specifically to talk about Choti and her work. What would you like to know about her background?"

**KEY FACTS TO HIGHLIGHT WHEN RELEVANT:**
- Choti has lived in 9 countries: Thailand, Switzerland, UK, Denmark, Slovenia, Spain, Maldives, Malaysia, Belgium
- Based in Belgium 🇧🇪 but has international experience
- Adapts quickly and works across cultures
- Available for opportunities in Belgium/remote
- Won Tech4Positive Futures Challenge 2024 (Capgemini Belgium) with coral reef monitoring solution

**Style & Voice:**
- Keep it SHORT - 2-3 sentences maximum per response
- Conversational and friendly, not formal
- Confident but never arrogant
- Use specific examples from the provided context

**Portfolio links to use:**
- Contact: https://jgchoti.github.io/contact
- Data science projects: https://jgchoti.github.io/data
- Web development projects: https://jgchoti.github.io/project

**Response Strategy:**
- Give a quick highlight from the context
- Direct to relevant portfolio section
- End with a simple question or next step
- Always stay on topic about Choti's career`;

export default async function handler(req, res) {
    // Set CORS headers using the same pattern as your health endpoint
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({
            error: 'Method not allowed',
            allowedMethods: ['POST']
        });
    }

    try {

        const { message, conversationHistory = [] } = req.body;
        // Validation
        if (!process.env.GEMINI_API_KEY) {
            console.error('Gemini API key not configured');
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Processing message:', message.substring(0, 50));

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite";
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                maxOutputTokens: 150,
                temperature: 0.8,
            }
        });

        let context = "Choti is a data professional with extensive international experience, having lived in 9 countries: Thailand, Switzerland, UK, Denmark, Slovenia, Spain, Maldives, Malaysia, and Belgium. She's currently based in Belgium and completing BeCode AI/Data Science Bootcamp. She adapts quickly, works across cultures, and has built multiple web applications and data projects.";

        if (getVectorStore) {
            try {
                const vectorStore = getVectorStore();
                const relevantDocs = await vectorStore.search(message, 3, 0.2);

                if (relevantDocs.length > 0) {
                    context = relevantDocs
                        .map(doc => `[${doc.metadata.type}] ${doc.content}`)
                        .join('\n\n');
                    console.log(`Found ${relevantDocs.length} relevant documents`);
                }
            } catch (ragError) {
                console.error('RAG search failed, using fallback:', ragError);
            }
        } else {
            console.log('Vector store not available, using fallback context');
        }

        // Build conversation context
        let conversationContext = '';
        if (conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
            conversationContext = recentHistory
                .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
                .join('\n') + '\n';
        }

        // Build the prompt for Gemini
        const prompt = `${SYSTEM_PROMPT}

**Context about Choti:**
${context}

**Conversation History:**
${conversationContext}

**Current Question:** ${message}

**Instructions:** Use the context above to provide accurate answers about Choti. Keep responses to 2-3 sentences maximum. Always include relevant portfolio links when appropriate.`;

        // Call Gemini
        console.log('Calling Gemini ...');
        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        console.log('Response generated successfully');

        return res.status(200).json({
            response: responseText,
            metadata: {
                model: 'gemini-2.0-flash-lite',
                ragEnabled: !!getVectorStore,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Gemini RAG Error:', error);

        // Return appropriate error based on error type
        if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
            return res.status(401).json({
                error: 'Gemini API authentication failed'
            });
        }

        if (error.message.includes('quota') || error.message.includes('rate')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: 60
            });
        }

        return res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            requestId: Math.random().toString(36).substring(7)
        });
    }
}