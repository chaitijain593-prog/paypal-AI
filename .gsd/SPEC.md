# Specification: PaySentinel AI

## Architecture
- **Frontend**: Next.js 14/16 App Router, React 19, Tailwind CSS v4, Framer Motion, Three.js (WebGL).
- **Backend**: FastAPI, Python 3.11+, Pydantic v2, Uvicorn.
- **AI Engine**: Gemini 2.5 Flash / OpenAI for adversarial dispute red-teaming.
- **Payment Layer**: PayPal REST API v2 (Orders v2, Disputes, Webhooks).
- **Proof Chain**: SHA-256 Merkle tree evidence ledger.
- **Grid**: AG Grid for transactional ledger and audit trails.
