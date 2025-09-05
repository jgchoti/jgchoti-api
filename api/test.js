// Save this as /api/test-vector.js
import { GoogleGenerativeAI } from '@google/generative-ai';

let getVectorStore;
try {
    const module = await import('../lib/HybridVectorStore');
    getVectorStore = module.getVectorStore;
} catch (error) {
    x
    console.error('Failed to import HybridVectorStore:', error);
    getVectorStore = null;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!getVectorStore) {
            return res.json({
                error: 'Vector store not available',
                available: false
            });
        }

        const vectorStore = getVectorStore();
        const stats = await vectorStore.getStats();


        const testQueries = [
            "data science experience",
            "web development projects",
            "international experience",
            "Belgium",
            "machine learning",
            "Choti background"
        ];

        const testResults = {};

        for (const query of testQueries) {
            try {
                const results = await vectorStore.search(query, 5, 0.0);
                testResults[query] = {
                    totalResults: results.length,
                    topResults: results.slice(0, 3).map(doc => ({
                        similarity: doc.similarity?.toFixed(4),
                        type: doc.metadata?.type,
                        contentPreview: doc.content?.substring(0, 150) + '...',
                        id: doc.id
                    }))
                };
            } catch (searchError) {
                testResults[query] = {
                    error: searchError.message
                };
            }
        }

        // Get sample documents by type
        const samplesByType = {};
        for (const type of Object.keys(stats.documentTypes || {})) {
            try {
                const samples = await vectorStore.getDocumentsByType(type);
                samplesByType[type] = samples.slice(0, 2).map(doc => ({
                    id: doc.id,
                    contentPreview: doc.content?.substring(0, 100) + '...'
                }));
            } catch (error) {
                samplesByType[type] = { error: error.message };
            }
        }

        return res.json({
            available: true,
            stats,
            testResults,
            samplesByType,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Vector test error:', error);
        return res.status(500).json({
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 3)
        });
    }
}