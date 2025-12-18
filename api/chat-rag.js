import { GoogleGenerativeAI } from '@google/generative-ai';
import { RunTree } from "langsmith";

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
You are Choti's professional career agent — confident, warm, and direct.
Represent Choti as a data professional with international experience.

BOUNDARIES:
- ONLY discuss Choti's career, skills, experience, and opportunities
- Off-topic (weather, recipes, etc.) → "I'm here to talk about Choti's work. What would you like to know?"
- Unclear → Ask for clarification
- Never assume information not in context

META-AWARENESS:
- About chatbot: "I'm the AI career agent Choti built using RAG technology with Google Gemini"

KEY FACTS:
- Lived in 9 countries; based in Belgium; available Belgium/remote; 2X Hackathon winner
- LinkedIn: https://www.linkedin.com/in/chotirat/
- PAGE GUIDANCE:
  - About Me page: overall background, accomplishments → https://jgchoti.github.io/about
  - Journey page: career timeline, experiences, international path across 9 countries → https://jgchoti.github.io/journey

STYLE:
- 2-3 sentences max
- Direct and specific - no buzzwords or fluff
- Vary responses to avoid repetition
- Include links only when relevant

CONVERSATION MEMORY:
- Reference earlier points: "As I mentioned..." / "Beyond what we discussed..."
- Build on previous answers instead of repeating

LINKS:
- Put links on their own line when possible
- Or use proper sentence structure: "Check her portfolio at [URL]."
- Never merge text with URLs: "details.[URL]" is wrong
- Data/AI: https://jgchoti.github.io/data
- Web: https://jgchoti.github.io/project
- About: https://jgchoti.github.io/about
- Journey: https://jgchoti.github.io/journey
- Contact: https://jgchoti.github.io/contact
- Blog: https://jgchoti.github.io/blog
- GitHub: https://github.com/jgchoti/[repo-name]

RESPONSE PATTERN:
- Give specific answer with example
- Add link if helpful
- End with simple question, next step, or open-ended CTA
`;

function sanitizeLinks(text) {
    return text.replace(/" target="_blank" rel="noopener noreferrer" class="text-primary">/g, '');
}

// Simple in-memory rate limiter
class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    async checkLimit() {
        const now = Date.now();
        // Clean old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);

        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = this.windowMs - (now - oldestRequest);
            throw new Error(`Rate limit: Wait ${Math.ceil(waitTime / 1000)}s`);
        }

        this.requests.push(now);
    }
}

// Create rate limiter: 10 requests per minute
const rateLimiter = new RateLimiter(10, 60000);

async function callGeminiWithRetry(model, prompt, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            const isRateLimit = error.message?.includes('429') ||
                error.message?.includes('quota') ||
                error.message?.includes('rate');

            if (isRateLimit && attempt < maxRetries - 1) {
                const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                // console.log(`⏳ Rate limited. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
}

export const config = {
    maxDuration: 30,
};

export default async function handler(req, res) {
    const startTime = Date.now();

    // Check LangSmith configuration
    const langsmithEnabled = !!(
        process.env.LANGCHAIN_API_KEY &&
        process.env.LANGCHAIN_TRACING_V2 === 'true' &&
        process.env.ENABLE_LANGSMITH !== 'false'
    );

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

    // Check rate limit before processing
    try {
        await rateLimiter.checkLimit();
    } catch (error) {
        console.warn('⚠️ Rate limiter triggered:', error.message);
        return res.status(429).json({
            error: error.message,
            retryAfter: 60
        });
    }

    const { message, conversationHistory = [] } = req.body;

    let trace = null;
    if (langsmithEnabled) {
        try {
            trace = new RunTree({
                name: "Choti Career Agent",
                run_type: "chain",
                inputs: { message, conversationHistory },
                project_name: process.env.LANGCHAIN_PROJECT || "jgchoti-api",
            });
            await trace.postRun();
            // console.log('✅ LangSmith trace created:', trace.id);
        } catch (traceError) {
            console.error('❌ Failed to create LangSmith trace:', traceError.message);
            trace = null;
        }
    }

    const timings = {};

    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error('Gemini API key not configured');
            if (trace) await trace.end({ error: "Gemini API key not configured" });
            return res.status(500).json({ error: 'Gemini API key not configured' });
        }

        if (!message?.trim()) {
            if (trace) await trace.end({ error: "Message is required" });
            return res.status(400).json({ error: 'Message is required' });
        }

        // console.log('Processing message:', message.substring(0, 100));

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

        // RAG Search with timing
        if (getVectorStore) {
            const ragStart = Date.now();
            let ragTrace = null;

            if (trace) {
                try {
                    ragTrace = await trace.createChild({
                        name: "RAG Search",
                        run_type: "retriever",
                        inputs: { query: message },
                    });
                    await ragTrace.postRun();
                } catch (childError) {
                    console.error('❌ Failed to create RAG child trace:', childError.message);
                }
            }

            try {
                const vectorStore = getVectorStore();
                await vectorStore.initialize();

                if (vectorStore) {
                    const goodResults = await vectorStore.search(message, 3, 0.3, 0.7);

                    if (goodResults.length > 0) {
                        const topResults = goodResults.slice(0, 3);
                        context = topResults
                            .map(doc => `[${doc.metadata?.type || 'unknown'}] ${doc.content}`)
                            .join('\n\n');
                        vectorUsed = true;
                    }
                }

                if (ragTrace) {
                    await ragTrace.end({ outputs: { vectorUsed, resultsCount: goodResults?.length || 0 } });
                    await ragTrace.patchRun();
                }
            } catch (ragError) {
                console.error('RAG search failed:', ragError.message);
                if (ragTrace) {
                    await ragTrace.end({ error: ragError.message });
                    await ragTrace.patchRun();
                }
            }

            timings.rag = Date.now() - ragStart;
        }

        // Build conversation context
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

**Instructions:** 
0. All pronouns (her, she, their) refer to Choti - treat as career questions
1. Check if the context above actually answers the question asked
2. If context is relevant → Use it to give a specific answer
3. If context exists but doesn't answer the question → "Choti doesn't have [X] experience. Her background includes [mention what IS in the context or her known skills: Python, Airflow, ML, data engineering]"
4. Keep responses to 2-3 sentences maximum
5. Include relevant portfolio links when appropriate;`;

        let llmTrace = null;
        if (trace) {
            try {
                llmTrace = await trace.createChild({
                    name: "Gemini Call",
                    run_type: "llm",
                    inputs: { prompt },
                });
                await llmTrace.postRun();
            } catch (childError) {
                console.error('❌ LLM trace failed (non-critical):', childError.message);
            }
        }

        // Call Gemini with retry logic
        const geminiStart = Date.now();
        const responseText = await callGeminiWithRetry(model, prompt);
        timings.gemini = Date.now() - geminiStart;

        if (llmTrace) {
            await llmTrace.end({ outputs: { response: responseText } });
            await llmTrace.patchRun();
        }

        const cleanedResponse = sanitizeLinks(responseText);

        timings.total = Date.now() - startTime;
        const responsePayload = {
            response: cleanedResponse,
            metadata: {
                model: modelName,
                ragEnabled: !!getVectorStore,
                vectorUsed,
                contextLength: context.length,
                timestamp: new Date().toISOString(),
                langsmithTraced: !!trace,
                timings
            }
        };


        if (trace) {
            trace.end({ outputs: responsePayload })
                .then(() => trace.patchRun())
                .then(() => console.log('✅ Trace posted to LangSmith'))
                .catch(err => console.error('❌ Failed to post trace:', err.message));
        }

        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error('Error:', {
            message: error.message,
            stack: error.stack?.split('\n')[0]
        });

        if (trace) {
            trace.end({ error: error.message })
                .then(() => trace.patchRun())
                .catch(err => console.error('Failed to post error trace:', err.message));
        }

        if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
            return res.status(401).json({
                error: 'Gemini API authentication failed'
            });
        }

        if (error.message.includes('quota') || error.message.includes('rate') || error.message.includes('429')) {
            console.error('Rate limit exceeded for Gemini API:', error.message);
            res.setHeader('X-Retry-After', '60');
            return res.status(429).json({
                error: 'Rate limit exceeded. Please try again in a moment.',
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