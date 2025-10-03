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
const SYSTEM_PROMPT = `
You are Choti's professional career agent — a skilled connector with confidence, warmth, and charm. 
Represent Choti as a standout data professional with international experience.

BOUNDARIES:
- ONLY discuss Choti's career, skills, experience, and opportunities
- Redirect off-topic: "I'm here specifically to talk about Choti and her work. What would you like to know about her background?"
- Never assume or infer information not in context

META-AWARENESS:
- About chatbot: "I'm the AI career agent Choti built using RAG technology with Google Gemini AI."

KEY FACTS:
- Lived in 9 countries; based in Belgium; available Belgium/remote
- Won Tech4Positive Futures Challenge 2024 (Capgemini Belgium)
- LinkedIn: https://www.linkedin.com/in/chotirat/

STYLE & VOICE:
- 2-3 sentences max, conversational, confident, warm
- Use specific examples; avoid repetition
- Flexible open-ended CTA: link to relevant work or invite follow-up questions
  Example: "She’s curious to explore opportunities where her skills can add value next — feel free to ask what you’d like to know more about."

LINKS & PORTFOLIO:
- GitHub: "💻 View the code: https://github.com/jgchoti/[repo-name]"
- Portfolio: Data/AI: https://jgchoti.github.io/data | Web: https://jgchoti.github.io/project
- Blog: https://jgchoti.github.io/blog
- Contact: https://jgchoti.github.io/contact | About: https://jgchoti.github.io/about

RESPONSE STRATEGY:
- Quick highlight from context
- Include link if relevant
- End with simple question, next step, or open-ended CTA
`;



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
                temperature: 0.5,
            }
        });

        let context = "Choti is a data professional with extensive international experience, having lived in 9 countries: Thailand, Switzerland, UK, Denmark, Slovenia, Spain, Maldives, Malaysia, and Belgium. She's currently based in Belgium and completing BeCode AI/Data Science Bootcamp. She adapts quickly, works across cultures, and has built multiple web applications and data projects.";
        let vectorUsed = false;
        let vectorDebugInfo = {};

        if (getVectorStore) {
            try {
                const vectorStore = getVectorStore();
                await vectorStore.initialize();

                if (!vectorStore) {
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
                        const topResults = goodResults.slice(0, 3);
                        context = topResults
                            .map(doc => `[${doc.metadata?.type || 'unknown'}] ${doc.content}`)
                            .join('\n\n');
                        vectorUsed = true;
                    }
                }
            } catch (ragError) {
                console.error('RAG search failed:', {
                    message: ragError.message,
                    stack: ragError.stack?.split('\n')[0]
                });
                vectorDebugInfo = { error: ragError.message };
            }
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
        let responseText = response.text();

        if (context.includes('[project]') || context.includes('[github-project]')) {
            const isDataProject = /(data|ai|ml|machine learning|pipeline|analysis|tlaas|nl-to-sql)/i.test(context);
            const wrongLink = isDataProject ? 'https://jgchoti.github.io/project' : 'https://jgchoti.github.io/data';
            const correctLink = isDataProject ? 'https://jgchoti.github.io/data' : 'https://jgchoti.github.io/project';

            if (responseText.includes(wrongLink)) {
                responseText = responseText.replace(wrongLink, correctLink);
            }
        }


        console.log('✅ Response generated successfully');
        console.log('📤 Final response preview:', responseText.substring(0, 100));

        return res.status(200).json({
            response: responseText,
            metadata: {
                model: 'gemini-2.0-flash-lite',
                ragEnabled: !!getVectorStore,
                vectorUsed,
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