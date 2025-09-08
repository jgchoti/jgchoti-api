## Choti Portfolio API — RAG Chatbot (Gemini)

RAG-powered serverless API that answers questions about Choti and her work. It uses a lightweight in-memory vector store loaded from precomputed embeddings and Google Gemini for both embeddings and generation.

### Features
- **RAG answers**: Retrieves relevant snippets from portfolio/profile/project documents
- **Gemini models**: `text-embedding-004` for search, configurable chat model for generation
- **Simple API**: `POST /api/chat-rag` with optional conversation history
- **Serverless ready**: Vercel functions with permissive CORS headers

### Tech Stack
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express (for local dev), Vercel Functions (deployment)
- **AI**: `@google/generative-ai`

### Project Structure
```text
api/                      # Serverless endpoints for Vercel
  chat-rag.js            # Main RAG chat endpoint (POST)
  health.js              # Health check (GET)
  index.js               # Root API info (GET)
data/                     # Data and generated embeddings
lib/
  HybridVectorStore.js   # In-memory vector store using Gemini embeddings
scripts/
  generate-embeddings.js # Builds data/embeddings-gemini.json from profile/projects
dev-server.js             # Local Express server that proxies to the handlers
vercel.json               # Vercel config (headers, rewrites, function settings)
package.json              # Scripts and dependencies
```

---

### Prerequisites
- Node.js 18+ (recommended)
- A Google Gemini API key
  - Create `.env.local` in the project root with:
    ```bash
    GEMINI_API_KEY=your_api_key_here
    # optional, defaults to gemini-2.0-flash-lite
    GEMINI_MODEL=gemini-2.0-flash-lite
    ```

### Install
```bash
npm install
```

### Run Locally
Two options:

- Using the included Express dev server (no Vercel CLI needed):
```bash
npm run dev
# -> http://localhost:3000
```

- Using Vercel Dev (requires `vercel` CLI):
```bash
npm start
# or
vercel dev
```

The dev server logs available endpoints on start.

---

### API

#### GET /api/health
Health check and basic info.
```bash
curl -s http://localhost:3000/api/health | jq
```

#### GET /api/
Root API info and usage.
```bash
curl -s http://localhost:3000/api/ | jq
```

#### POST /api/chat-rag
Chat with the RAG agent about Choti. Returns model text and debug metadata.

Request body:
```json
{
  "message": "What kind of roles is Choti looking for?",
  "conversationHistory": [
    { "type": "user", "content": "Hi" },
    { "type": "assistant", "content": "Hello!" }
  ]
}
```

Example:
```bash
curl -s -X POST http://localhost:3000/api/chat-rag \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Summarize Choti\'s international experience.",
    "conversationHistory": []
  }' | jq
```

Response (shape):
```json
{
  "response": "...model text...",
  "metadata": {
    "model": "gemini-2.0-flash-lite",
    "ragEnabled": true,
    "vectorUsed": true,
    "vectorDebugInfo": { "resultsUsed": 3, "topSimilarity": 0.42 },
    "contextLength": 1234,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

Notes:
- `conversationHistory` is optional; items should be `{ type: 'user' | 'assistant', content: string }`.
- If embeddings are missing or the vector store is not ready, the endpoint falls back to a small default context.

---

### Embeddings and RAG
The vector store (`lib/HybridVectorStore.js`) loads from `data/embeddings-gemini.json` and uses cosine similarity to retrieve relevant snippets. Query embeddings are computed on-the-fly using Gemini `text-embedding-004`, so `GEMINI_API_KEY` is required both to generate embeddings and to serve queries.

#### Generate/Refresh embeddings
```bash
# requires GEMINI_API_KEY in .env.local
npm run generate-embeddings
```
This script builds content from `data/profileData.js`, `data/projectData.js`, and `data/contactInfo.js`, creates embeddings with Gemini, and writes:
- `data/embeddings-gemini.json`
- `data/embeddings-gemini-metadata.json`

---

### Environment Variables
- **GEMINI_API_KEY**: Required. Google Gemini API key.
- **GEMINI_MODEL**: Optional. Defaults to `gemini-2.0-flash-lite` for generation.

Create `.env.local` in the project root for local runs. When deploying to Vercel, set these in the project’s Environment Variables.

---

### CORS
Vercel adds permissive CORS headers for `/api/**` via `vercel.json`. The handlers also set restrictive origins in-code. For self-hosting, update the `allowedOrigins` lists in:
- `api/health.js`
- `api/chat-rag.js`

Local development accepts `http://localhost:3000`.

---

### Deployment (Vercel)
```bash
# optional: login and link
vercel login
vercel link

# set env variables in Vercel dashboard or via CLI
vercel env add GEMINI_API_KEY
vercel env add GEMINI_MODEL  # optional

# deploy
npm run deploy
# or
vercel --prod
```

---

### Troubleshooting
- **401/Authentication**: Ensure `GEMINI_API_KEY` is set locally and on Vercel.
- **429/Rate limit**: Back off and retry; the API returns `retryAfter` when applicable.
- **Vector store not ready**: Run `npm run generate-embeddings` to create `data/embeddings-gemini.json`.

---

### License
MIT (unless stated otherwise by the repository owner).

