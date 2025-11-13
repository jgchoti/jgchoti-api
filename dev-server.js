import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRagHandler from './api/chat-rag.js';
import healthHandler from './api/health.js';
import indexHandler from './api/index.js';

// Load environment variables FIRST
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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