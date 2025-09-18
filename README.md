# Choti Portfolio API — RAG Chatbot (Gemini)

RAG-powered serverless API that answers questions about me and my work. It uses a lightweight in-memory vector store loaded from precomputed embeddings and Google Gemini for both embeddings and generation.

[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)

---

## The Story Behind This API

### Because "Please Please Please" Don't Give Me Generic Responses

![pleasepleaseplease](https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExa2lkbTVyYnJtOGg5M29scWU2eG1obGVpYm5ycnFla3ZiODFzM3V5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/eMHPMfxTKlAXyJV4AO/giphy.gif)

Just like Sabrina sings about wanting something real — this API delivers context-rich answers about my portfolio instead of the same old chatbot nonsense. 🎵

## 📋 Table of Contents

- [Choti Portfolio API — RAG Chatbot (Gemini)](#choti-portfolio-api--rag-chatbot-gemini)
  - [The Story Behind This API](#the-story-behind-this-api)
    - [Because "Please Please Please" Don't Give Me Generic Responses](#because-please-please-please-dont-give-me-generic-responses)
  - [📋 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [🛠️ Tech Stack](#️-tech-stack)
  - [📋 Prerequisites](#-prerequisites)
  - [🚀 Installation](#-installation)
  - [💻 Running Locally](#-running-locally)
  - [📚 API Documentation](#-api-documentation)
    - [Base URL](#base-url)
    - [Endpoints](#endpoints)
      - [GET /api/health](#get-apihealth)
      - [GET /api/](#get-api)
      - [POST /api/chat-rag](#post-apichat-rag)
  - [🔍 Embeddings and RAG](#-embeddings-and-rag)
  - [🔍 Dynamic Portfolio Integration](#-dynamic-portfolio-integration)
    - [Generate/Refresh Embeddings](#generaterefresh-embeddings)
  - [🔧 Environment Variables](#-environment-variables)
  - [📁 Project Structure](#-project-structure)
  - [🚀 Deployment (Vercel)](#-deployment-vercel)
    - [Step-by-step deployment:](#step-by-step-deployment)
    - [Alternative: Deploy via Vercel Dashboard](#alternative-deploy-via-vercel-dashboard)
  - [🛠️ Troubleshooting](#️-troubleshooting)
    - [Common Issues](#common-issues)
  - [🤖 Demo](#-demo)

## ✨ Features

- 🤖 **RAG answers**: Retrieves relevant snippets from contact details/profile/project documents
- 🧠 **Gemini models**: `text-embedding-004` for search, configurable chat model for generation
- 🚀 **Simple API**: `POST /api/chat-rag` with optional conversation history
- ☁️ **Serverless ready**: Vercel functions with permissive CORS headers
- 🔍 **Vector similarity search**: Cosine similarity-based document retrieval
- 🛡️ **Health monitoring**: Built-in health check endpoints

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+ (ES Modules)
- **Framework:** Express (for local dev), Vercel Functions (deployment)
- **AI/ML:** `@google/generative-ai`
- **Vector Store:** Custom in-memory implementation with Gemini embeddings
- **Deployment:** Vercel
- **Database:** File-based embeddings storage

## 📋 Prerequisites

Before running this project, make sure you have:

- Node.js 18+ (recommended)
- A Google Gemini API key
- Create `.env.local` in the project root with:
  ```bash
  GEMINI_API_KEY=your_api_key_here
  # optional, defaults to gemini-2.0-flash-lite
  GEMINI_MODEL=gemini-2.0-flash-lite
  ```

## 🚀 Installation

```bash
# Clone the repository
git clone https://github.com/jgchoti/jgchoti-api.git
cd jgchoti-api

# Install dependencies
npm install
```

## 💻 Running Locally

Two options available:

```bash
npm run dev
# -> http://localhost:3000
```

The dev server logs available endpoints on start.

## 📚 API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints

#### GET /api/health

Health check and basic info.

```bash
curl -s http://localhost:3000/api/health | jq
```

**Response:**

```json
{
  "status": "healthy",
  "message": "Choti's Portfolio API is running!",
  "endpoints": {
    "chat": "/api/chat-rag",
    "health": "/api/health"
  },
  "timestamp": "2025-09-08T17:44:01.845Z"
}
```

#### GET /api/

Root API info and usage documentation.

```bash
curl -s http://localhost:3000/api/
```

**Response:**

```json
{
  "message": "Welcome to Choti's Portfolio API! 🤖",
  "description": "RAG-powered chatbot API for portfolio inquiries",
  "endpoints": {
    "chat": "/api/chat-rag - POST - Chat with Choti's AI agent",
    "health": "/api/health - GET - Health check"
  },
  "usage": {
    "method": "POST",
    "url": "/api/chat-rag",
    "body": {
      "message": "Your question here",
      "conversationHistory": "Optional previous messages"
    }
  },
  "portfolio": "https://jgchoti.github.io",
  "github": "https://github.com/jgchoti"
}
```

#### POST /api/chat-rag

Chat with the RAG agent about Choti. Returns model text and debug metadata.

**Example Request:**

```bash
curl -s -X POST https://jgchoti-api.vercel.app/api/chat-rag \
  -H 'Content-Type: application/json' \
  -d '{
    "message": "Summarize Choti'\''s international experience.",
    "conversationHistory": []
  }'
```

**Response Structure:**

```json
{
  "response": "Choti has a truly global perspective, having lived and worked in nine countries, including Thailand, Switzerland, and the UK. This international experience gives her a unique edge in cross-cultural collaboration and understanding global markets. You can see how she applies this in her data projects here: https://jgchoti.github.io/data. What kind of role are you looking to fill?",
  "metadata": {
    "model": "gemini-2.0-flash-lite",
    "ragEnabled": true,
    "vectorUsed": true,
    "vectorDebugInfo": {
      "resultsUsed": 3,
      "topSimilarity": 0.6907635643942781,
      "types": ["profile", "contact", "profile"],
      "similarities": [
        0.6907635643942781, 0.6208553455982836, 0.5978628425932092
      ]
    },
    "contextLength": 3803,
    "timestamp": "2025-09-08T17:48:34.895Z"
  }
}
```

**Notes:**

- `conversationHistory` is optional; items should be `{ type: 'user' | 'assistant', content: string }`
- If embeddings are missing or the vector store is not ready, the endpoint falls back to a small default context

## 🔍 Embeddings and RAG

The vector store (`lib/HybridVectorStore.js`) loads from `data/embeddings-gemini.json` and uses cosine similarity to retrieve relevant snippets. Query embeddings are computed on-the-fly using Gemini `text-embedding-004`, so `GEMINI_API_KEY` is required both to generate embeddings and to serve queries.

## 🔍 Dynamic Portfolio Integration

The system automatically enriches portfolio data through:

- **GitHub API integration** (`scripts/generate-github.js`) that discovers and analyzes repositories and content extraction from README files and repository metadata
- **Career path relevance scoring** for data engineering, data science, ML engineering, and backend development roles

### Generate/Refresh Embeddings

```bash
npm run generate-embeddings
```

This script builds content from:

- `data/profileData.js`
- `data/projectData.js`
- `data/contactInfo.js`
- `data/github_portfolio_data.json`

Creates embeddings with Gemini and writes:

- `data/embeddings-gemini.json`
- `data/embeddings-gemini-metadata.json`

## 🔧 Environment Variables

Create a `.env.local` file in the project root:

```env
# Required: Google Gemini API key
GEMINI_API_KEY=your_api_key_here

# Optional: Gemini model for generation (defaults to gemini-2.0-flash-lite)
GEMINI_MODEL=gemini-2.0-flash-lite
```

**For Vercel deployment:** Set these in the project's Environment Variables dashboard.

## 📁 Project Structure

```
jgchoti-api/
├── api/                      # Serverless endpoints for Vercel
│   ├── chat-rag.js          # Main RAG chat endpoint (POST)
│   ├── health.js            # Health check (GET)
│   └── index.js             # Root API info (GET)
├── data/                     # Data and generated embeddings
│   ├── profileData.js       # Profile information
│   ├── projectData.js       # Project data
│   ├── contactInfo.js       # Contact information
│   ├── embeddings-gemini.json          # Generated embeddings
│   └── embeddings-gemini-metadata.json # Embedding metadata
├── lib/
│   └── HybridVectorStore.js # In-memory vector store using Gemini embeddings
├── scripts/
│   └── generate-embeddings.js # Builds embeddings from profile/projects
├── dev-server.js             # Local Express server that proxies to handlers
├── vercel.json               # Vercel config (headers, rewrites, function settings)
├── package.json              # Scripts and dependencies
├── .env.local                # Environment variables (create this)
└── README.md
```

## 🚀 Deployment (Vercel)

### Step-by-step deployment:

1. **Login and link project:**

   ```bash
   vercel login
   vercel link
   ```

2. **Set environment variables:**

   ```bash
   vercel env add GEMINI_API_KEY
   vercel env add GEMINI_MODEL  # optional
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   # or
   vercel --prod
   ```

### Alternative: Deploy via Vercel Dashboard

1. Connect your GitHub repository to Vercel
2. Set environment variables in the dashboard
3. Deploy automatically on git push

## 🛠️ Troubleshooting

### Common Issues

**401/Authentication Error**

- Ensure `GEMINI_API_KEY` is set correctly in `.env.local` (local) and Vercel dashboard (production)
- Verify your Gemini API key is valid and has proper permissions

**Vector Store Not Ready**

- Run `npm run generate-embeddings` to create `data/embeddings-gemini.json`
- Ensure all required data files exist in the `data/` directory

**Port Already in Use**

- Change the port in `dev-server.js` or kill the process using port 3000
- Check for other running Node.js processes

**Missing Dependencies**

- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (18+ required)

## 🤖 Demo

Chat with the deployed bot at: [https://jgchoti.github.io/](https://jgchoti.github.io/)

_Professional AI that actually understands context and delivers responses that make sense — no generic chatbot nonsense here. ✨_
