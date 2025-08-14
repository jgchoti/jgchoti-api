// lib/HybridVectorStore.js - Vector store that loads pre-computed embeddings
import OpenAI from 'openai';
import embeddingsData from '../data/embeddings.json';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export class HybridVectorStore {
    constructor() {
        this.documents = embeddingsData;
        this.isReady = true;
    }

    // Calculate cosine similarity between two vectors
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

    // Get embedding for a query
    async getQueryEmbedding(text) {
        try {
            const response = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: text.trim(),
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('Error getting query embedding:', error);
            throw error;
        }
    }

    // Search for similar documents
    async search(query, k = 3, minSimilarity = 0.1) {
        if (!this.isReady) {
            throw new Error('Vector store not ready');
        }

        // Get embedding for the query
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

    // Search by document type
    async searchByType(query, documentType, k = 2) {
        const allResults = await this.search(query, this.documents.length);
        return allResults
            .filter(doc => doc.metadata.type === documentType)
            .slice(0, k);
    }

    // Get documents by type without search
    getDocumentsByType(documentType) {
        return this.documents
            .filter(doc => doc.metadata.type === documentType)
            .map(doc => ({
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata
            }));
    }

    // Get random documents for suggestions
    getRandomDocuments(count = 2) {
        const shuffled = [...this.documents].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count).map(doc => ({
            id: doc.id,
            content: doc.content,
            metadata: doc.metadata
        }));
    }

    // Get statistics about the vector store
    getStats() {
        const typeCount = {};
        this.documents.forEach(doc => {
            typeCount[doc.metadata.type] = (typeCount[doc.metadata.type] || 0) + 1;
        });

        return {
            totalDocuments: this.documents.length,
            documentTypes: typeCount,
            embeddingDimensions: this.documents[0]?.embedding.length || 0,
            isReady: this.isReady
        };
    }
}

// Singleton instance to avoid reloading embeddings
let vectorStoreInstance = null;

export function getVectorStore() {
    if (!vectorStoreInstance) {
        vectorStoreInstance = new HybridVectorStore();
    }
    return vectorStoreInstance;
}