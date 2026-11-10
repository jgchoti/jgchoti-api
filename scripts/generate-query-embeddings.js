// Precomputes query embeddings for the frontend's suggested questions and
// writes data/query-embeddings-cache.json, which the vector store loads at
// startup. Clicking a suggested question then needs no embedding API call,
// even on a cold start.
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { suggestedQuestions } from '../data/suggestedQuestions.js';
import {
    EMBEDDING_DIMENSIONS,
    EMBEDDING_MODEL,
    QUERY_EMBEDDING_CACHE_FILE,
    fetchQueryEmbedding,
    normalizeQuery
} from '../lib/HybridVectorStore.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const entries = {};
    for (const question of suggestedQuestions) {
        const key = normalizeQuery(question);
        if (entries[key]) continue;
        console.log(`🔢 Embedding: ${question}`);
        entries[key] = await fetchQueryEmbedding(genAI, question);
    }

    const output = {
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
        generatedAt: new Date().toISOString(),
        entries
    };

    const outputPath = path.join(__dirname, '..', 'data', QUERY_EMBEDDING_CACHE_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(output));
    console.log(`✅ Wrote ${Object.keys(entries).length} query embeddings to ${outputPath}`);
}

main().catch(error => {
    console.error('❌ Failed to generate query embeddings:', error.message);
    process.exit(1);
});
