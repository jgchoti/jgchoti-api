import OpenAI from 'openai';
import { getVectorStore } from '../lib/HybridVectorStore.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are Choti's professional career agent — a skilled connector who blends confidence, warmth, and a hint of charm. You represent Choti as a standout data professional with international experience.

**IMPORTANT BOUNDARIES:**
- You ONLY discuss topics related to Choti, her career, skills, experience, and professional opportunities
- If someone asks about unrelated topics, politely redirect: "I'm here specifically to talk about Choti and her work. What would you like to know about her background?"
- If someone asks inappropriate questions, respond: "Let's keep this professional and focused on Choti's career opportunities."

**Style & Voice:**
- Keep it SHORT - 2-3 sentences maximum per response
- Conversational and friendly, not formal
- Confident but never arrogant
- Use specific examples from the provided context
- Always include relevant portfolio links when appropriate

**Portfolio links to use:**
- Contact: https://jgchoti.vercel.app/contact
- Data science projects: https://jgchoti.vercel.app/data  
- Web development projects: https://jgchoti.vercel.app/project
- Learning journey/blog: https://jgchoti.vercel.app/blog
- Complete portfolio: https://jgchoti.vercel.app/

**Response Strategy:**
- Give a quick highlight from the context
- Direct to relevant portfolio section
- End with a simple question or next step
- Always stay on topic about Choti's career`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message, conversationHistory = [] } = req.body;

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Get vector store instance
        const vectorStore = getVectorStore();

        // Search for relevant documents
        console.log(`🔍 Searching for: "${message}"`);
        const relevantDocs = await vectorStore.search(message, 3, 0.2);

        console.log(`📄 Found ${relevantDocs.length} relevant documents`);

        // Build context from relevant documents
        let context = '';
        if (relevantDocs.length > 0) {
            context = relevantDocs
                .map(doc => {
                    const similarity = (doc.similarity * 100).toFixed(1);
                    return `[${doc.metadata.type}] ${doc.content} (relevance: ${similarity}%)`;
                })
                .join('\n\n');
        } else {
            // Fallback: get some random documents if no good matches
            const fallbackDocs = vectorStore.getRandomDocuments(2);
            context = fallbackDocs
                .map(doc => `[${doc.metadata.type}] ${doc.content}`)
                .join('\n\n');
        }

        // Build conversation messages
        const messages = [
            {
                role: 'system',
                content: `${SYSTEM_PROMPT}

**Context about Choti (use this to answer questions):**
${context}

Use the context above to provide accurate, specific answers about Choti. If the context doesn't contain relevant information for the question, say so and suggest checking her portfolio.`
            }
        ];

        // Add conversation history (last 3 exchanges to maintain context)
        if (conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6); // Last 3 user+bot exchanges
            recentHistory.forEach(msg => {
                messages.push({
                    role: msg.type === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }

        // Add current message
        messages.push({
            role: 'user',
            content: message
        });

        // Call OpenAI
        console.log('🤖 Calling OpenAI...');
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 150,
            temperature: 0.8,
        });

        const response = completion.choices[0].message.content;

        // Log for debugging (remove in production)
        console.log(`💬 Response: ${response.substring(0, 100)}...`);

        return res.status(200).json({
            response: response,
            metadata: {
                relevantSources: relevantDocs.length,
                sources: relevantDocs.map(doc => ({
                    type: doc.metadata.type,
                    similarity: doc.similarity,
                    snippet: doc.content.substring(0, 100) + '...'
                })),
                vectorStoreStats: vectorStore.getStats()
            }
        });

    } catch (error) {
        console.error('❌ RAG Error:', error);

        // Return appropriate error based on error type
        if (error.message.includes('API key')) {
            return res.status(401).json({
                error: 'OpenAI API authentication failed',
                details: 'Please check your API key configuration'
            });
        }

        if (error.message.includes('rate limit')) {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                details: 'Please try again in a moment'
            });
        }

        return res.status(500).json({
            error: 'Failed to process request',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}

// Health check endpoint
export async function healthCheck(req, res) {
    try {
        const vectorStore = getVectorStore();
        const stats = vectorStore.getStats();

        return res.status(200).json({
            status: 'healthy',
            vectorStore: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
}