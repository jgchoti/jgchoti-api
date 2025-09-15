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
    }

    async initialize() {
        if (this.isReady) return;

        this.documents = await loadEmbeddings();
        this.isReady = this.documents.length > 0;
    }

    cosineSimilarity(a, b) {
        if (a.length !== b.length) {
            throw new Error('Vectors must have the same length');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async getQueryEmbedding(text) {
        if (!this.genAI) {
            throw new Error('Gemini API key not configured');
        }

        try {
            const model = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await model.embedContent(text.trim());
            return result.embedding.values;
        } catch (error) {
            console.error('Error getting Gemini query embedding:', error);
            throw error;
        }
    }

    async search(query, k = 3, minSimilarity = 0.1) {
        await this.initialize();

        if (!this.isReady) {
            throw new Error('Vector store not ready');
        }

        const queryEmbedding = await this.getQueryEmbedding(query);

        // Calculate similarities
        const similarities = this.documents.map(doc => ({
            document: {
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata
            },
            similarity: this.cosineSimilarity(queryEmbedding, doc.embedding)
        }));

        // Sort by similarity and filter by minimum threshold
        const results = similarities
            .filter(item => item.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);

        return results.map(item => ({
            ...item.document,
            similarity: item.similarity
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