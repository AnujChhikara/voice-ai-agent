# Real-Time Voice AI Agent

## Overview

An end-to-end real-time voice agent built on LiveKit WebRTC. Users speak to an AI assistant that transcribes their speech (Deepgram), retrieves relevant context from uploaded documents (ChromaDB RAG), generates a response (GPT-4o-mini), and speaks it back (OpenAI TTS). A React frontend provides voice controls, live transcript, a particle-sphere voice visualizer, document upload, and system prompt editing.

---

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│      Frontend       │         │       Backend         │
│   React + Vite/TS   │◄──────►│   Node.js / Express   │
│                     │  REST   │                       │
│  - LiveKit Room API │         │  - Google OAuth       │
│  - Transcript view  │         │  - LiveKit token gen  │
│  - Particle orb     │         │  - Document ingestion │
│  - Doc upload       │         │  - Prompt management  │
│  - Prompt editor    │         │                       │
└────────┬────────────┘         └──────────┬────────────┘
         │                                 │
         │  WebRTC (audio + transcripts)   │  HTTP (token)
         │                                 │
         ▼                                 ▼
┌─────────────────────────────────────────────────────────┐
│                    LiveKit Cloud                         │
│         (WebRTC SFU + agent job dispatch)               │
└──────────────────────────┬──────────────────────────────┘
                           │  Agent SDK (WebSocket)
                           ▼
                ┌──────────────────────┐
                │        Agent         │
                │  Node.js / @livekit  │         ┌─────────────┐
                │  /agents worker      │◄───────►│   ChromaDB  │
                │                     │  HTTP    │  (vectors)  │
                │  STT → RAG → LLM    │         └─────────────┘
                │       → TTS         │
                └──────────────────────┘
```

**Three independent services:**

- **Frontend** (`frontend/`) — React + Vite + TypeScript. Connects to LiveKit via the raw `Room` API (not `@livekit/components-react`). Handles audio track attachment, transcript rendering, voice orb animation, document management, and prompt editing.
- **Backend** (`backend/`) — Node.js + Express. Handles Google OAuth (httpOnly cookie sessions), LiveKit JWT token generation, document ingestion into ChromaDB, and system prompt persistence.
- **Agent** (`agent/`) — Node.js `@livekit/agents` worker. Registered with LiveKit Cloud; receives a job whenever a user connects. Runs the STT → RAG → LLM → TTS pipeline per user turn.

---

## Data Flow

### Voice Call

1. User clicks the mic → frontend calls `POST /api/token` with `{ room, identity }`
2. Backend generates a LiveKit JWT (signed with `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET`) and returns `{ token, url }`
3. Frontend calls `room.connect(url, token)`, then `room.startAudio()` (resumes browser AudioContext) and enables the microphone
4. LiveKit Cloud sees a participant in the room and dispatches an agent job to the worker
5. Agent connects, starts an `AgentSession` with Deepgram STT / GPT-4o-mini / OpenAI TTS, then greets the user
6. User speaks → Deepgram transcribes in real-time → `onUserTurnCompleted` fires on the agent
7. Agent embeds the query with `text-embedding-3-small`, queries ChromaDB for top-4 chunks, injects them as a system message into the turn context
8. LLM generates a response (using injected context if available, own knowledge otherwise)
9. OpenAI TTS synthesizes audio → LiveKit streams it back to the browser
10. Frontend receives `RoomEvent.TrackSubscribed` → calls `track.attach()` → appends `<audio autoplay>` to DOM → user hears the response
11. `RoomEvent.TranscriptionReceived` updates the live transcript

### Document RAG

1. User uploads a PDF or TXT → `POST /api/documents` (multipart)
2. Backend: `pdf-parse` extracts text; plain text files read as UTF-8
3. Text chunked into 600-character windows with 100-character overlap
4. All chunks embedded in one batch via `text-embedding-3-small` (1536-dim vectors)
5. Chunks + vectors + metadata (`{ doc_id, filename }`) stored in ChromaDB collection `knowledge_base`
6. On each user turn, the agent embeds the query and retrieves the top-4 most similar chunks by cosine similarity
7. Chunks are concatenated and prepended to the LLM turn as a `system` message

---

## Tech Stack & Decisions

| Component | Choice | Why |
|---|---|---|
| Voice infrastructure | LiveKit | Native Node.js agent SDK; handles WebRTC SFU, STT/LLM/TTS orchestration, and agent job dispatch in one platform |
| STT | Deepgram nova-2 | Lowest streaming latency among hosted providers; first-class LiveKit plugin |
| LLM | GPT-4o-mini | Fast and cost-effective for conversational QA; native LiveKit plugin |
| TTS | OpenAI TTS (alloy) | Lowest added latency when already on the OpenAI stack; native plugin |
| Vector store | ChromaDB | Self-hosted, zero cost, simple Docker setup; HTTP API accessible from both backend and agent |
| Embeddings | text-embedding-3-small | Best price/performance ratio for semantic search at 1536 dims |
| Auth | Google OAuth + httpOnly cookies | No password management; httpOnly cookies eliminate XSS token theft |
| Frontend | React + Vite + TypeScript | Vite's HMR and native ESM keep the dev loop fast |

---

## Key Implementation Details

**Manual audio attachment.** The raw `Room` API does not auto-play remote tracks. The frontend listens for `RoomEvent.TrackSubscribed`, calls `track.attach()` to create an `<audio>` element, and appends it to the DOM with `autoplay = true`. `room.startAudio()` must be called after a user gesture to resume the browser's suspended `AudioContext`.

**RAG injection via `onUserTurnCompleted`.** When context is found, adding a message to the `chatCtx` copy makes it non-equivalent to the preemptive generation's snapshot — LiveKit cancels the preemptive LLM call and restarts with the enriched context. When no relevant context exists, the preemptive result is used directly (fast path, no extra latency).

**Transcript participant detection.** `RoomEvent.TranscriptionReceived` fires with `participant = undefined` for the agent's greeting (before any user speech). The check `participant?.isLocal === false` correctly identifies agent transcripts; a simple truthiness check misclassifies the greeting as a user message and permanently locks `agentThinking` state.

**FormData + axios interceptor.** A request interceptor sets `Content-Type: application/json` for all requests. Without an `instanceof FormData` guard, it overwrites the `multipart/form-data` boundary on file uploads, causing the server to reject them.

**ChromaDB client version.** Chroma server ≥1.4 uses the v2 HTTP API (`/api/v2`). The `chromadb` npm package v1.x targets the old `/api/v1` paths. This project uses `chromadb@^3.x` and constructs the client with `{ ssl, host, port }` (the `path` constructor arg is deprecated in v3).

---

## Setup

> **Quick local testing (no Google OAuth needed):** Set `SKIP_AUTH=true` in `backend/.env` to bypass login entirely. The app will work without setting up Google OAuth credentials.

### Prerequisites

- Node.js 20+
- pnpm (`npm i -g pnpm`)
- Docker
- [LiveKit Cloud](https://cloud.livekit.io) account (free tier works)
- OpenAI API key
- Deepgram API key
- Google OAuth 2.0 credentials ([Google Cloud Console](https://console.cloud.google.com))

### 1. Start ChromaDB

```bash
docker run -p 8001:8000 chromadb/chroma
```

For persistent storage across restarts:

```bash
docker run -v ./chroma-data:/chroma/chroma -p 8001:8000 chromadb/chroma
```

### 2. Environment Variables

Copy `.env.example` to `.env` in each service and fill in values:

```bash
cp backend/.env.example backend/.env
cp agent/.env.example agent/.env
cp frontend/.env.example frontend/.env
```

Add this to your Google OAuth app's authorized redirect URIs:
```
http://localhost:8000/api/auth/google/callback
```

### 3. Install & Run

Run each in a separate terminal, in this order:

```bash
# Backend
cd backend && pnpm install && pnpm dev

# Agent
cd agent && pnpm install && pnpm dev

# Frontend
cd frontend && pnpm install && pnpm dev
```

### 4. Open

Navigate to `http://localhost:5173` — sign in with Google, upload a document via the `+` button or Settings panel, then click the mic to start a call.

---

## Project Structure

```
voice-ai-agent/
├── agent/
│   ├── src/
│   │   ├── pipeline.js   # AgentSession config, RAGAgent, turn handling
│   │   └── rag.js        # ChromaDB query + embedding retrieval
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── index.js              # Express app, middleware, route mounting
│   │   ├── routes/
│   │   │   ├── auth.js           # Google OAuth flow, JWT cookie issuance
│   │   │   ├── documents.js      # Upload, list, delete KB documents
│   │   │   ├── prompt.js         # Read/write system prompt
│   │   │   └── token.js          # LiveKit JWT generation
│   │   ├── middleware/auth.js    # JWT cookie verification
│   │   └── lib/kb.js             # PDF parse, chunk, embed, ChromaDB write
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.tsx                       # Main UI: landing, transcript, voice orb
    │   ├── components/ParticleSphere.tsx  # Canvas particle sphere visualizer
    │   ├── hooks/
    │   │   ├── useAgent.ts               # LiveKit Room connection + event state
    │   │   └── useAuth.ts                # Session query + logout
    │   ├── api/                          # Typed API clients per resource
    │   └── lib/api-client.ts             # axios instance + FormData-aware interceptor
    └── .env.example
```

---

## Known Limitations

- **ChromaDB is in-memory by default** — data is lost when the container stops unless a volume is mounted (see setup above)
- **Shared knowledge base** — each session gets a unique room ID (`room-<uuid>`) so voice sessions are isolated, but all users share the same ChromaDB collection and system prompt; there is no per-user document or data separation
- **RAG latency** — each user turn incurs ~300–500ms for the embedding API call + ChromaDB query before the LLM starts
- **Prompt changes** take effect on the next call; the agent reads `prompt.txt` once at session start
- **No token refresh** — the access token TTL is 2h; after expiry the user must sign in again
- **Hard document delete** — deleting a document permanently removes its chunks from ChromaDB with no recovery path. A production system would use PostgreSQL as the source of truth: store the original file (`bytea`) and metadata (uploader, timestamps, `is_deleted` flag) in PG, use ChromaDB purely as a search index, and implement soft delete with a 30-day retention window before hard deletion. This also enables re-indexing from PG if the chunking strategy or embedding model changes, per-user document isolation, and file retrieval after upload.
