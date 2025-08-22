import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import chatRagHandler from './api/chat-rag.js';
import healthHandler from './api/health.js';
import indexHandler from './api/index.js';

// Load environment variables
config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


function createMockReqRes(method, body = {}, headers = {}) {
    const req = {
        method,
        body,
        headers: {
            origin: 'http://localhost:3000',
            ...headers
        }
    };

    const res = {
        status: (code) => ({
            json: (data) => ({ statusCode: code, data }),
            end: () => ({ statusCode: code })
        }),
        setHeader: () => { },
        end: () => { }
    };

    return { req, res };
}

// API endpoints


app.get('/api/test', async (req, res) => {
    try {
        let getVectorStore;
        try {
            const module = await import('./lib/HybridVectorStore.js');
            getVectorStore = module.getVectorStore;
        } catch (error) {
            console.error('Failed to import HybridVectorStore:', error);
            return res.json({
                error: 'Vector store not available',
                available: false,
                importError: error.message
            });
        }

        if (!getVectorStore) {
            return res.json({
                error: 'Vector store not available',
                available: false
            });
        }

        const vectorStore = getVectorStore();

        // Get basic stats
        console.log('🔍 Getting vector store stats...');
        const stats = await vectorStore.getStats();
        console.log('📊 Stats:', stats);

        // Test different queries
        const testQueries = [
            "data science experience",
            "web development projects",
            "international experience",
            "Belgium",
            "machine learning",
            "Choti background"
        ];

        const testResults = {};

        console.log('🧪 Testing queries...');
        for (const query of testQueries) {
            try {
                console.log(`  Testing: "${query}"`);
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
                console.log(`    Found ${results.length} results, top similarity: ${results[0]?.similarity?.toFixed(4) || 'N/A'}`);
            } catch (searchError) {
                console.error(`    Error searching "${query}":`, searchError.message);
                testResults[query] = {
                    error: searchError.message
                };
            }
        }

        // Get sample documents by type
        const samplesByType = {};
        if (stats.documentTypes) {
            console.log('📄 Getting samples by type...');
            for (const type of Object.keys(stats.documentTypes)) {
                try {
                    const samples = await vectorStore.getDocumentsByType(type);
                    samplesByType[type] = samples.slice(0, 2).map(doc => ({
                        id: doc.id,
                        contentPreview: doc.content?.substring(0, 100) + '...'
                    }));
                    console.log(`  ${type}: ${samples.length} documents`);
                } catch (error) {
                    console.error(`  Error getting ${type} samples:`, error.message);
                    samplesByType[type] = { error: error.message };
                }
            }
        }

        const result = {
            available: true,
            stats,
            testResults,
            samplesByType,
            timestamp: new Date().toISOString()
        };

        console.log('✅ Test completed successfully');
        res.json(result);

    } catch (error) {
        console.error('💥 Vector test error:', error);
        res.status(500).json({
            error: error.message,
            stack: error.stack?.split('\n').slice(0, 3),
            available: false
        });
    }
});


app.get('/api/health', async (req, res) => {
    const { req: mockReq, res: mockRes } = createMockReqRes('GET');
    const result = await healthHandler(mockReq, mockRes);
    res.status(result.statusCode).json(result.data);
});

app.get('/api/', async (req, res) => {
    const { req: mockReq, res: mockRes } = createMockReqRes('GET');
    const result = await indexHandler(mockReq, mockRes);
    res.status(result.statusCode).json(result.data);
});

app.post('/api/chat-rag', async (req, res) => {
    const { req: mockReq, res: mockRes } = createMockReqRes('POST', req.body);
    const result = await chatRagHandler(mockReq, mockRes);
    res.status(result.statusCode).json(result.data);
});

// Health check for the dev server
app.get('/dev/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'Development server is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            index: '/api/',
            chat: '/api/chat-rag'
        }
    });
});




app.listen(PORT, () => {
    console.log(`🚀 Development server running on http://localhost:${PORT}`);
    console.log('');
    console.log('📡 API Endpoints:');
    console.log(`  GET  http://localhost:${PORT}/api/health`);
    console.log(`  GET  http://localhost:${PORT}/api/`);
    console.log(`  POST http://localhost:${PORT}/api/chat-rag`);
    console.log('');
    console.log('🔧 Dev Endpoints:');
    console.log(`  GET  http://localhost:${PORT}/dev/health`);
    console.log('');
    console.log('💡 Use Ctrl+C to stop the server');
});
