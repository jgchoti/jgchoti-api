import { GoogleGenerativeAI } from '@google/generative-ai';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describeGeminiError, getGeminiErrorInfo } from './geminiErrors.js';

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSIONS = 768;
export const QUERY_EMBEDDING_CACHE_FILE = 'query-embeddings-cache.json';

// Per-instance LRU of query embeddings. Warm serverless instances reuse it,
// so repeat questions skip the Gemini embedding call.
const MAX_CACHED_QUERIES = 500;

let embeddingsData = null;

async function loadEmbeddings() {
    if (embeddingsData) return embeddingsData;

    const filePath = resolve(process.cwd(), 'data', 'embeddings-gemini.json');
    console.log('📋 Loading embeddings from:', filePath);

    const fileContent = readFileSync(filePath, 'utf8');
    embeddingsData = JSON.parse(fileContent);

    console.log(`✅ Loaded ${embeddingsData.length} embeddings successfully`);
    console.log(`🔢 Embedding dimensions: ${embeddingsData[0]?.embedding?.length}`);

    return embeddingsData;
}

// Cache key: case-, whitespace- and trailing-punctuation-insensitive, so
// "Tell me about her recent projects" and "tell me about her recent projects?"
// share one embedding.
export function normalizeQuery(text) {
    return String(text ?? '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[\s?!.]+$/, '');
}

export async function fetchQueryEmbedding(genAI, text) {
    const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
    const result = await model.embedContent({
        content: { parts: [{ text: text.trim() }] },
        outputDimensionality: EMBEDDING_DIMENSIONS
    });
    return result.embedding.values;
}

// Precomputed embeddings for the frontend's suggested questions
// (scripts/generate-query-embeddings.js). They survive cold starts, unlike
// the in-memory LRU. Ignored if missing or built for another model/size.
let precomputedQueryEmbeddings = null;

function loadPrecomputedQueryEmbeddings() {
    if (precomputedQueryEmbeddings) return precomputedQueryEmbeddings;
    precomputedQueryEmbeddings = new Map();

    const filePath = resolve(process.cwd(), 'data', QUERY_EMBEDDING_CACHE_FILE);
    if (!existsSync(filePath)) return precomputedQueryEmbeddings;

    try {
        const data = JSON.parse(readFileSync(filePath, 'utf8'));
        if (data.model !== EMBEDDING_MODEL || data.dimensions !== EMBEDDING_DIMENSIONS) {
            console.warn(`⚠️ Ignoring ${QUERY_EMBEDDING_CACHE_FILE}: built for ${data.model}/${data.dimensions}, expected ${EMBEDDING_MODEL}/${EMBEDDING_DIMENSIONS}`);
            return precomputedQueryEmbeddings;
        }
        for (const [query, values] of Object.entries(data.entries || {})) {
            if (Array.isArray(values) && values.length === EMBEDDING_DIMENSIONS) {
                precomputedQueryEmbeddings.set(normalizeQuery(query), values);
            }
        }
        console.log(`✅ Loaded ${precomputedQueryEmbeddings.size} precomputed query embeddings`);
    } catch (error) {
        console.warn(`⚠️ Could not load ${QUERY_EMBEDDING_CACHE_FILE}:`, error.message);
    }
    return precomputedQueryEmbeddings;
}


export class GeminiVectorStore {
    constructor() {
        this.documents = [];
        this.isReady = false;
        this.genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
        this.tfidf = {
            documents: [],
            idf: new Map()
        };
        // normalized query -> Promise<number[]>. Storing the promise also lets
        // concurrent identical queries share one in-flight request.
        this.queryEmbeddingCache = new Map();
        this.queryEmbeddingStats = { precomputed: 0, cached: 0, fetched: 0 };
    }

    async initialize() {
        if (this.isReady) return;

        this.documents = await loadEmbeddings();
        this.precomputedQueryEmbeddings = loadPrecomputedQueryEmbeddings();
        if (this.documents.length > 0) {
            this.buildTfidfIndex();
            this.isReady = true;
        }
    }

    buildTfidfIndex() {
        const N = this.documents.length;
        const docFrequencies = new Map();

        this.documents.forEach((doc, i) => {
            const terms = this.getTerms(doc.content);
            const termFrequencies = new Map();
            terms.forEach(term => {
                termFrequencies.set(term, (termFrequencies.get(term) || 0) + 1);
            });

            const tf = new Map();
            termFrequencies.forEach((freq, term) => {
                tf.set(term, freq / terms.length);
            });

            this.tfidf.documents[i] = tf;

            const uniqueTerms = new Set(terms);
            uniqueTerms.forEach(term => {
                docFrequencies.set(term, (docFrequencies.get(term) || 0) + 1);
            });
        });

        docFrequencies.forEach((df, term) => {
            this.tfidf.idf.set(term, Math.log(N / (1 + df)));
        });
    }

    getTerms(text) {
        return text.toLowerCase().split(/\W+/).filter(Boolean);
    }

    getCosineSimilarity(a, b) {
        if (a.length !== b.length) {
            return 0;
        }
        let dotProduct = 0,
            normA = 0,
            normB = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    getTfidfScore(queryTerms, docIndex) {
        let score = 0;
        const docTf = this.tfidf.documents[docIndex];
        queryTerms.forEach(term => {
            if (docTf.has(term) && this.tfidf.idf.has(term)) {
                score += docTf.get(term) * this.tfidf.idf.get(term);
            }
        });
        return score;
    }

    async getQueryEmbedding(text) {
        const key = normalizeQuery(text);

        const precomputed = this.precomputedQueryEmbeddings?.get(key);
        if (precomputed) {
            this.queryEmbeddingStats.precomputed++;
            return precomputed;
        }

        const cached = this.queryEmbeddingCache.get(key);
        if (cached) {
            // Refresh LRU position.
            this.queryEmbeddingCache.delete(key);
            this.queryEmbeddingCache.set(key, cached);
            this.queryEmbeddingStats.cached++;
            return cached;
        }

        if (!this.genAI) throw new Error('Gemini API key not configured');

        this.queryEmbeddingStats.fetched++;
        const pending = fetchQueryEmbedding(this.genAI, text);
        this.queryEmbeddingCache.set(key, pending);
        if (this.queryEmbeddingCache.size > MAX_CACHED_QUERIES) {
            this.queryEmbeddingCache.delete(this.queryEmbeddingCache.keys().next().value);
        }

        try {
            return await pending;
        } catch (error) {
            // Don't cache failures (e.g. a 429) — the next request should retry.
            if (this.queryEmbeddingCache.get(key) === pending) {
                this.queryEmbeddingCache.delete(key);
            }
            throw error;
        }
    }

    // Used when the query can't be embedded (quota exhausted, API down):
    // still returns grounded documents instead of no context at all.
    keywordSearch(queryTerms, k) {
        return this.documents
            .map((doc, i) => ({
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata,
                vectorScore: null,
                keywordScore: this.getTfidfScore(queryTerms, i),
                retrieval: 'keyword'
            }))
            .filter(item => item.keywordScore > 0)
            .sort((a, b) => b.keywordScore - a.keywordScore)
            .slice(0, k)
            .map(item => ({ ...item, similarity: item.keywordScore }));
    }

    async search(query, k = 3, minSimilarity = 0.1, alpha = 0.6) {
        await this.initialize();
        if (!this.isReady) throw new Error('Vector store not ready');

        const queryTerms = this.getTerms(query);

        let queryEmbedding;
        try {
            queryEmbedding = await this.getQueryEmbedding(query);
        } catch (error) {
            console.warn(`⚠️ Query embedding failed (${describeGeminiError(getGeminiErrorInfo(error))}) - falling back to keyword-only search`);
            return this.keywordSearch(queryTerms, k);
        }

        const results = this.documents.map((doc, i) => {
            const vectorScore = this.getCosineSimilarity(queryEmbedding, doc.embedding);
            const keywordScore = this.getTfidfScore(queryTerms, i);

            return {
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata,
                vectorScore,
                keywordScore,
                retrieval: 'hybrid',
                combinedScore: alpha * vectorScore + (1 - alpha) * keywordScore
            };
        });

        const filteredAndSorted = results
            .filter(item => item.vectorScore >= minSimilarity)
            .sort((a, b) => b.combinedScore - a.combinedScore)
            .slice(0, k);

        return filteredAndSorted.map(({ combinedScore, ...rest }) => ({
            ...rest,
            similarity: combinedScore
        }));
    }
}

let vectorStoreInstance = null;

export function getVectorStore() {
    if (!vectorStoreInstance) {
        vectorStoreInstance = new GeminiVectorStore();
    }
    return vectorStoreInstance;
}