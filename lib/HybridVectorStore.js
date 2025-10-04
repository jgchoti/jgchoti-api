import { GoogleGenerativeAI } from '@google/generative-ai';
import { readFileSync } from 'fs';
import { resolve } from 'path';

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


export class GeminiVectorStore {
    constructor() {
        this.documents = [];
        this.isReady = false;
        this.genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
        this.tfidf = {
            documents: [],
            idf: new Map()
        };
    }

    async initialize() {
        if (this.isReady) return;

        this.documents = await loadEmbeddings();
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
        if (!this.genAI) throw new Error('Gemini API key not configured');
        const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(text.trim());
        return result.embedding.values;
    }

    async search(query, k = 3, minSimilarity = 0.1, alpha = 0.6) {
        await this.initialize();
        if (!this.isReady) throw new Error('Vector store not ready');

        const queryEmbedding = await this.getQueryEmbedding(query);
        const queryTerms = this.getTerms(query);

        const results = this.documents.map((doc, i) => {
            const vectorScore = this.getCosineSimilarity(queryEmbedding, doc.embedding);
            const keywordScore = this.getTfidfScore(queryTerms, i);

            return {
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata,
                vectorScore,
                keywordScore,
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