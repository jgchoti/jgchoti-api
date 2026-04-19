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
- Current role: Data/AI Engineer at a startup in Antwerp, Belgium
- Current focus: data pipelines (ETL), LLM/RAG/GenAI systems, internal tools & agents
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

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CONTENT_LENGTH = 2000;

function sanitizeLinks(text) {
    // Strip any stray HTML tags/attributes the model may have emitted.
    return text
        .replace(/<\/?a\b[^>]*>/gi, '')
        .replace(/\s*target="_blank"\s*/gi, '')
        .replace(/\s*rel="[^"]*"\s*/gi, '')
        .replace(/\s*class="[^"]*"\s*/gi, '');
}

function getClientIp(req) {
    const fwd = req.headers['x-forwarded-for'];
    if (typeof fwd === 'string' && fwd.length > 0) {
        return fwd.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
}

function sanitizeHistory(history) {
    if (!Array.isArray(history)) return [];
    return history
        .filter(m => m && typeof m === 'object'
            && (m.type === 'user' || m.type === 'bot' || m.type === 'assistant')
            && typeof m.content === 'string')
        .slice(-MAX_HISTORY_MESSAGES)
        .map(m => ({
            type: m.type,
            content: m.content.slice(0, MAX_HISTORY_CONTENT_LENGTH)
        }));
}

class RateLimiter {
    constructor(maxRequests = 10, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.buckets = new Map(); // key -> number[] of timestamps
    }

    async checkLimit(key = 'global') {
        const now = Date.now();
        const timestamps = (this.buckets.get(key) || []).filter(t => now - t < this.windowMs);

        if (timestamps.length >= this.maxRequests) {
            const waitTime = this.windowMs - (now - timestamps[0]);
            throw new Error(`Rate limit: Wait ${Math.ceil(waitTime / 1000)}s`);
        }

        timestamps.push(now);
        this.buckets.set(key, timestamps);

        // Opportunistic cleanup so the map does not grow unbounded.
        if (this.buckets.size > 500) {
            for (const [k, ts] of this.buckets) {
                const kept = ts.filter(t => now - t < this.windowMs);
                if (kept.length === 0) this.buckets.delete(k);
                else this.buckets.set(k, kept);
            }
        }
    }
}

// NOTE: in-memory rate limiting is best-effort on serverless (each instance
// has its own Map). For stricter limits, back this with Vercel KV / Upstash.
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
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`⏳ Rate limited. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            throw error;
        }
    }
}

export const config = {
    maxDuration: 10,
};

export default async function handler(req, res) {
    const startTime = Date.now();

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

    const clientIp = getClientIp(req);
    try {
        await rateLimiter.checkLimit(clientIp);
    } catch (error) {
        console.warn('⚠️ Rate limiter triggered for', clientIp, '-', error.message);
        return res.status(429).json({
            error: error.message,
            retryAfter: 60
        });
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const rawMessage = typeof body.message === 'string' ? body.message : '';
    const message = rawMessage.trim();
    const conversationHistory = sanitizeHistory(body.conversationHistory);

    if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({
            error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)`
        });
    }

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
            console.log('✅ LangSmith trace created:', trace.id);
        } catch (traceError) {
            console.error('❌ LangSmith trace failed (non-critical):', traceError.message);
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

        if (!message) {
            if (trace) await trace.end({ error: "Message is required" });
            return res.status(400).json({ error: 'Message is required' });
        }

        console.log('Processing message:', message.substring(0, 100));

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelName = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                maxOutputTokens: 800,
                temperature: 0.5,
                thinkingConfig: {
                    thinkingLevel: "MINIMAL"
                }
            }
        });

        let context = "Choti is a Data/AI Engineer at a startup in Antwerp, Belgium. Her current work focuses on building data pipelines (ETL, ingestion, warehousing), LLM/RAG/GenAI systems (chatbots, agents, retrieval pipelines), and internal tools/agents. She completed the BeCode AI/Data Science Bootcamp and brings extensive international experience, having lived in 9 countries (Thailand, Switzerland, UK, Denmark, Slovenia, Spain, Maldives, Malaysia, Belgium). 2x hackathon winner. Based in Belgium; available for Belgium-based or remote roles.";
        let vectorUsed = false;

        if (getVectorStore) {
            const ragStart = Date.now();
            let ragTrace = null;

            if (trace && process.env.TRACE_RAG === 'true') {
                try {
                    ragTrace = await trace.createChild({
                        name: "RAG Search",
                        run_type: "retriever",
                        inputs: { query: message },
                    });
                    await ragTrace.postRun();
                } catch (childError) {
                    console.error('❌ RAG trace failed (non-critical):', childError.message);
                }
            }

            try {
                const ragPromise = (async () => {
                    const vectorStore = getVectorStore();
                    await vectorStore.initialize();

                    if (vectorStore) {
                        const goodResults = await vectorStore.search(message, 3, 0.3, 0.7);
                        console.log('🎯 Found', goodResults.length, 'results in', Date.now() - ragStart, 'ms');

                        if (goodResults.length > 0) {
                            const topResults = goodResults.slice(0, 3);
                            return {
                                context: topResults
                                    .map(doc => `[${doc.metadata?.type || 'unknown'}] ${doc.content}`)
                                    .join('\n\n'),
                                vectorUsed: true
                            };
                        }
                    }
                    return { context, vectorUsed: false };
                })();

                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('RAG timeout')), 3000)
                );

                const result = await Promise.race([ragPromise, timeoutPromise]);
                context = result.context;
                vectorUsed = result.vectorUsed;

                if (ragTrace) {
                    await ragTrace.end({ outputs: { vectorUsed } });
                    await ragTrace.patchRun();
                }
            } catch (ragError) {
                console.warn('⚠️ RAG search failed/timeout:', ragError.message, '- using default context');
                if (ragTrace) {
                    await ragTrace.end({ error: ragError.message });
                    await ragTrace.patchRun();
                }
            }

            timings.rag = Date.now() - ragStart;
        }

        let conversationContext = '';
        if (conversationHistory.length > 0) {
            const recentHistory = conversationHistory.slice(-6);
            conversationContext = recentHistory
                .map(msg => `${msg.type === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`)
                .join('\n') + '\n';
        }

        const contextLabel = vectorUsed
            ? "Retrieved from Choti's portfolio knowledge base (most relevant first)"
            : "General profile (no specific documents retrieved for this query)";

        const prompt = `${SYSTEM_PROMPT}

**Context about Choti** (${contextLabel}):
${context}

**Conversation History:**
${conversationContext || '(no prior messages)'}

**Current Question:** ${message}

**Instructions:**
0. All pronouns (her, she, their) refer to Choti — treat as career questions.
1. Ground your answer ONLY in the context above. Do not invent companies, titles, dates, or projects.
2. If the context directly answers the question → give a specific answer with a concrete example.
3. If the context is general but not specific to the question → answer from what IS known (current role: Data/AI Engineer at a startup in Antwerp focused on data pipelines, RAG/LLM, and agents; skills: Python, Airflow, ML, data engineering) and acknowledge the gap briefly.
4. Never name the specific employer unless the context explicitly does.
5. Keep responses to 2-3 sentences. Include one relevant portfolio link when it adds value.

**Response:**`;

        let llmTrace = null;
        if (trace && process.env.TRACE_LLM === 'true') {
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

        const geminiStart = Date.now();
        const responseText = await callGeminiWithRetry(model, prompt);
        timings.gemini = Date.now() - geminiStart;

        if (llmTrace) {
            llmTrace.end({ outputs: { response: responseText } })
                .then(() => llmTrace.patchRun())
                .catch(err => console.error('Failed to end LLM trace:', err.message));
        }

        const cleanedResponse = sanitizeLinks(responseText);

        timings.total = Date.now() - startTime;
        console.log('⏱️ Timings:', timings);

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

        const requestId = Math.random().toString(36).substring(7);
        console.error(`[${requestId}] Internal error:`, error.message);
        return res.status(500).json({
            error: 'Internal server error',
            requestId
        });
    }
}