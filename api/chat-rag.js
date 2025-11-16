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
- Career question but no context → "Choti doesn't have [X] experience. Her background is in [relevant alternative from context]."
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

export const config = {
    maxDuration: 30,
};

export default async function handler(req, res) {
    // Check LangSmith configuration
    const langsmithEnabled = !!(
        process.env.LANGCHAIN_API_KEY &&
        process.env.LANGCHAIN_TRACING_V2 === 'true'
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
            console.log('✅ LangSmith trace created:', trace.id);
        } catch (traceError) {
            console.error('❌ Failed to create LangSmith trace:', traceError.message);
            trace = null;
        }
    }

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
            let ragTrace = null;
            if (trace) {
                try {
                    ragTrace = await trace.createChild({
                        name: "RAG Search",
                        run_type: "retriever",
                        inputs: { query: message },
                    });
                    await ragTrace.postRun();
                    console.log('✅ RAG trace created:', ragTrace.id);
                } catch (childError) {
                    console.error('❌ Failed to create RAG child trace:', childError.message);
                }
            }

            let goodResults = [];
            try {
                const vectorStore = getVectorStore();
                await vectorStore.initialize();

                if (!vectorStore) {
                    console.warn('⚠️ Vector store not ready or empty');
                } else {
                    console.log('🔍 Searching with query:', message);
                    goodResults = await vectorStore.search(message, 3, 0.3, 0.7);
                    console.log('🎯 Search results:', {
                        totalFound: goodResults.length,
                        topScores: goodResults.slice(0, 5).map(d => ({
                            similarity: d.similarity?.toFixed(3),
                            type: d.metadata?.type,
                            contentPreview: d.content?.substring(0, 80) + '...'
                        }))
                    });

                    if (goodResults.length > 0) {
                        const topResults = goodResults.slice(0, 3);
                        context = topResults
                            .map(doc => `[${doc.metadata?.type || 'unknown'}] ${doc.content}`)
                            .join('\n\n');
                        vectorUsed = true;
                    }
                }

                if (ragTrace) {
                    await ragTrace.end({
                        outputs: { context, vectorUsed, resultsCount: goodResults?.length || 0 }
                    });
                    await ragTrace.patchRun();
                    console.log('✅ RAG trace ended');
                }
            } catch (ragError) {
                console.error('RAG search failed:', {
                    message: ragError.message,
                    stack: ragError.stack?.split('\n')[0]
                });
                vectorDebugInfo = { error: ragError.message };

                if (ragTrace) {
                    await ragTrace.end({ error: ragError.message });
                    await ragTrace.patchRun();
                }
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

        let llmTrace = null;
        if (trace) {
            try {
                llmTrace = await trace.createChild({
                    name: "Gemini Call",
                    run_type: "llm",
                    inputs: { prompt },
                });
                await llmTrace.postRun();
                console.log('✅ LLM trace created:', llmTrace.id);
            } catch (childError) {
                console.error('❌ Failed to create LLM child trace:', childError.message);
            }
        }

        const result = await model.generateContent(prompt);
        const response = result.response;
        let responseText = response.text();

        if (llmTrace) {
            await llmTrace.end({ outputs: { response: responseText } });
            await llmTrace.patchRun();
            console.log('✅ LLM trace ended');
        }

        console.log('🔹 RAW GEMINI RESPONSE:', responseText);

        responseText = sanitizeLinks(responseText);

        console.log('✅ Response generated successfully');
        console.log('📤 Final response preview:', responseText.substring(0, 100));

        const responsePayload = {
            response: responseText,
            metadata: {
                model: 'gemini-2.0-flash-lite',
                ragEnabled: !!getVectorStore,
                vectorUsed,
                contextLength: context.length,
                timestamp: new Date().toISOString(),
                langsmithTraced: !!trace
            }
        };

        if (trace) {
            await trace.end({ outputs: responsePayload });
            await trace.patchRun();
            console.log('✅ Main trace ended and posted to LangSmith');
        }

        return res.status(200).json(responsePayload);

    } catch (error) {
        console.error('Error:', {
            message: error.message,
            stack: error.stack?.split('\n')[0]
        });

        if (trace) {
            await trace.end({ error: error.message });
            await trace.patchRun();
        }

        if (error.message.includes('API_KEY') || error.message.includes('authentication')) {
            return res.status(401).json({
                error: 'Gemini API authentication failed'
            });
        }

        if (error.message.includes('quota') || error.message.includes('rate')) {
            console.error('Rate limit exceeded for Gemini API:', {
                message: error.message,
            });
            res.setHeader('X-Retry-After', 60);
            return res.status(429).json({
                error: 'Rate limit exceeded. Please try again later.',
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