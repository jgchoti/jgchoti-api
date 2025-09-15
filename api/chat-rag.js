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
    'http://localhost:3000'
];

const SYSTEM_PROMPT = `You are Choti's professional career agent — a skilled connector who combines confidence, warmth, and charm.
You represent Choti as a standout data professional with international experience.

**IMPORTANT BOUNDARIES:**
- You ONLY discuss topics related to Choti, her career, skills, experience, and professional opportunities
- If someone asks about unrelated topics, politely redirect: "I'm here specifically to talk about Choti and her work. What would you like to know about her background?"
- NEVER assume or infer information not explicitly provided in the context

**SPECIAL META-AWARENESS:**
- When someone asks about the chatbot, AI system, or this conversation system itself, remind them: "I'm the AI career agent Choti built using RAG technology with Google Gemini AI."
- When discussing the AI Career Agent project, emphasize the live demo aspect: "You're experiencing this RAG system firsthand as we chat!"

**KEY FACTS TO HIGHLIGHT WHEN RELEVANT:**
- Choti has lived in 9 countries: Thailand, Switzerland, UK, Denmark, Slovenia, Spain, Maldives, Malaysia, Belgium
- Based in Belgium but has international experience
- Adapts quickly and works across cultures
- Available for opportunities in Belgium/remote
- Won Tech4Positive Futures Challenge 2024 (Capgemini Belgium) with coral reef monitoring solution in 2024 (not recently!)
- Contact: https://jgchoti.github.io/contact
- About Choti : https://jgchoti.github.io/about

**Style & Voice:**
- Keep it SHORT - 2-3 sentences maximum per response
- Conversational and friendly, not formal
- Confident but never arrogant
- Use specific examples from the provided context
- Avoid repetition

**Portfolio links to use:**
- Data science projects: https://jgchoti.github.io/data
- Web development projects: https://jgchoti.github.io/project

**GitHub Response Rules:**
- If the message asks about "github" generally (not specific projects): "You can find Choti's GitHub profile here: https://github.com/jgchoti"
- If the response uses information from GitHub sources/projects: Add "💻 View the code: https://github.com/jgchoti/[repo-name]" or "💻 See more on GitHub: https://github.com/jgchoti"

**Response Strategy:**
- Give a quick highlight from the context
- Direct to relevant portfolio section
- End with a simple question or next step
- Always stay on topic about Choti's career`;

export default async function handler(req, res) {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');


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

        if (!process.env.GEMINI_API_KEY) {
            console.error('Gemini API key not configured');
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        if (!message?.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Processing message:', message.substring(0, 100));

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
        let vectorUsed = false;
        let vectorDebugInfo = {};

        if (getVectorStore) {
            try {
                console.log('🔧 Initializing vector store...');
                const vectorStore = getVectorStore();

                const stats = await vectorStore.getStats();
                console.log('📊 Vector store stats:', {
                    totalDocuments: stats.totalDocuments,
                    documentTypes: stats.documentTypes,
                    isReady: stats.isReady,
                    provider: stats.provider
                });

                if (!stats.isReady || stats.totalDocuments === 0) {
                    console.warn('⚠️ Vector store not ready or empty');
                } else {

                    console.log('🔍 Searching with query:', message);
                    const allResults = await vectorStore.search(message, 10, 0.0);

                    console.log('🎯 Raw search results:', {
                        totalFound: allResults.length,
                        topScores: allResults.slice(0, 5).map(d => ({
                            similarity: d.similarity?.toFixed(3),
                            type: d.metadata?.type,
                            contentPreview: d.content?.substring(0, 80) + '...'
                        }))
                    });

                    const goodResults = allResults.filter(doc => doc.similarity > 0.1);
                    console.log(`✅ Good results (similarity > 0.1): ${goodResults.length}`);

                    if (goodResults.length > 0) {
                        // Use top 3 good results
                        const topResults = goodResults.slice(0, 3);
                        context = topResults
                            .map(doc => `[${doc.metadata?.type || 'unknown'}] ${doc.content}`)
                            .join('\n\n');

                        vectorUsed = true;
                        vectorDebugInfo = {
                            resultsUsed: topResults.length,
                            topSimilarity: topResults[0].similarity,
                            types: topResults.map(d => d.metadata?.type),
                            similarities: topResults.map(d => d.similarity)
                        };

                        console.log('🚀 Using vector context:', {
                            resultsUsed: topResults.length,
                            topSimilarity: topResults[0].similarity?.toFixed(3),
                            contextLength: context.length
                        });
                    } else if (allResults.length > 0) {
                        console.log('📝 All similarities below 0.1, using top result anyway');
                        const topResult = allResults[0];
                        context = `${context}\n\n**Additional Context:**\n[${topResult.metadata?.type}] ${topResult.content}`;

                        vectorUsed = true;
                        vectorDebugInfo = {
                            resultsUsed: 1,
                            topSimilarity: topResult.similarity,
                            types: [topResult.metadata?.type],
                            lowConfidence: true
                        };
                    } else {
                        console.log('❌ No search results found');
                    }
                }
            } catch (ragError) {
                console.error('RAG search failed:', {
                    message: ragError.message,
                    stack: ragError.stack?.split('\n')[0]
                });
                vectorDebugInfo = { error: ragError.message };
            }
        } else {
            console.log('Vector not available, using fallback context');
        }


        let conversationContext = '';
        if (conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6);
            conversationContext = recentHistory
                .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
                .join('\n') + '\n';
        }

        const prompt = `${SYSTEM_PROMPT}

**Context about Choti:**
${context}

**Conversation History:**
${conversationContext}

**Current Question:** ${message}

**Instructions:** Use the context above to provide accurate answers about Choti. Keep responses to 2-3 sentences maximum. Always include relevant portfolio links when appropriate.`;


        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.text();

        console.log('✅ Response generated successfully');
        console.log('📤 Final response preview:', responseText.substring(0, 100));

        return res.status(200).json({
            response: responseText,
            metadata: {
                model: 'gemini-2.0-flash-lite',
                ragEnabled: !!getVectorStore,
                vectorUsed,
                vectorDebugInfo,
                contextLength: context.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error:', {
            message: error.message,
            stack: error.stack?.split('\n')[0]
        });

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