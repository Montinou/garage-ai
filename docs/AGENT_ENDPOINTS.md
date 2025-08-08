# Agent Endpoints - Vercel AI SDK Implementation

## Overview

This document describes the new agent endpoints implemented using Vercel AI SDK with Gemini 2.5 Flash. These endpoints provide complete, chat, and structured object generation capabilities.

## Environment Variables

```bash
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key

# Optional Configuration
MODEL_NAME=gemini-2.5-flash           # Default model
AI_TEMPERATURE=0.3                    # Default temperature
MAX_OUTPUT_TOKENS=2048               # Default max tokens
ALLOWED_ORIGINS=*                    # CORS origins
AI_DEBUG=false                       # Debug mode
PORT=8080                           # Server port
```

## Endpoints

### 1. Complete Endpoint (Non-streaming)

**URL:** `POST /api/agents/{agentId}/complete`

**Description:** Generates text completion using Gemini 2.5 Flash without streaming.

**Request Body:**
```json
{
  "prompt": "Explica en 2 frases qué es la inteligencia artificial.",
  "system": "Eres un experto en tecnología que explica conceptos de forma clara.",
  "temperature": 0.3,
  "maxOutputTokens": 1024
}
```

**Response:**
```json
{
  "text": "La inteligencia artificial es...",
  "finishReason": "stop",
  "usage": {
    "promptTokens": 25,
    "completionTokens": 150,
    "totalTokens": 175
  },
  "model": "gemini-2.5-flash",
  "agentId": "analyzer",
  "processingTime": 1250,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Rate Limit:** 10 requests per minute per client

### 2. Chat Endpoint (Streaming SSE)

**URL:** `POST /api/agents/{agentId}/chat`

**Description:** Streams chat responses using Server-Sent Events (SSE).

**Request Body:**
```json
{
  "messages": [
    {"role": "user", "content": "Hola, ¿puedes ayudarme?"},
    {"role": "assistant", "content": "¡Por supuesto! ¿En qué puedo ayudarte?"},
    {"role": "user", "content": "Cuéntame sobre vehículos eléctricos"}
  ],
  "temperature": 0.3,
  "maxOutputTokens": 2048
}
```

**Response (SSE Stream):**
```
data: {"delta": "Los", "agentId": "chat-agent", "chunk": 1}

data: {"delta": " vehículos", "agentId": "chat-agent", "chunk": 2}

data: {"delta": " eléctricos", "agentId": "chat-agent", "chunk": 3}

event: end
data: {"usage": {"totalTokens": 245}, "agentId": "chat-agent", "model": "gemini-2.5-flash", "processingTime": 2100, "totalChunks": 25, "timestamp": "2025-01-15T10:30:00.000Z"}
```

**Headers:**
- `Content-Type: text/event-stream; charset=utf-8`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

**Rate Limit:** 5 requests per minute per client

### 3. Object Endpoint (Structured Output)

**URL:** `POST /api/agents/{agentId}/object`

**Description:** Generates structured objects using Zod schemas.

**Available Schemas:**
- `default`: General intent and entity extraction
- `vehicle`: Vehicle information extraction
- `custom`: User-defined Zod schema

**Request Body (Vehicle Schema):**
```json
{
  "prompt": "Toyota Corolla 2020, precio $250,000, usado, 45,000 km, ubicado en Ciudad de México",
  "schema": "vehicle",
  "temperature": 0.1,
  "maxOutputTokens": 1024
}
```

**Response:**
```json
{
  "object": {
    "marca": "Toyota",
    "modelo": "Corolla",
    "año": 2020,
    "precio": 250000,
    "kilometraje": 45000,
    "condicion": "Usado",
    "caracteristicas": [],
    "ubicacion": "Ciudad de México"
  },
  "warnings": [],
  "usage": {
    "promptTokens": 30,
    "completionTokens": 85,
    "totalTokens": 115
  },
  "schema": "vehicle",
  "model": "gemini-2.5-flash",
  "agentId": "extractor",
  "processingTime": 850,
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Custom Schema Example:**
```json
{
  "prompt": "Extract contact info: John Doe, email john@example.com, phone +1234567890",
  "schema": "custom",
  "customSchema": {
    "name": { "type": "string" },
    "email": { "type": "string" },
    "phone": { "type": "string" }
  }
}
```

**Rate Limit:** 8 requests per minute per client

## Health Check Endpoints

All endpoints support GET requests for health checks:

```bash
GET /api/agents/{agentId}/complete
GET /api/agents/{agentId}/chat
GET /api/agents/{agentId}/object
```

**Response:**
```json
{
  "service": "Agent Complete (Vercel AI SDK)",
  "agentId": "test-agent",
  "model": "gemini-2.5-flash",
  "streaming": false,
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## Error Handling

**Standard Error Response:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

**Common Error Codes:**
- `VALIDATION_ERROR` (400): Invalid request body
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `LLM_ERROR` (500): AI model error
- `LLM_OBJECT_ERROR` (500): Structured output error
- `INVALID_SCHEMA` (400): Invalid custom schema

## CORS Support

All endpoints include proper CORS headers and support preflight OPTIONS requests.

## Security Features

- Rate limiting per client IP
- Input validation and sanitization
- Prompt length limits (100KB max)
- Security headers (XSS protection, content type sniffing)
- Request logging with anonymization

## Testing

Use the provided test script:

```bash
node scripts/test-ai-endpoints.js
```

Or test manually with curl:

```bash
# Test complete endpoint
curl -X POST "http://localhost:3000/api/agents/test/complete" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello world"}'

# Test chat streaming
curl -N -X POST "http://localhost:3000/api/agents/test/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'

# Test object extraction
curl -X POST "http://localhost:3000/api/agents/test/object" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Toyota Corolla 2020","schema":"vehicle"}'
```

## Migration from Legacy Endpoints

The new endpoints are designed to replace the existing AI agent calls. Update your orchestration logic to use these new endpoints:

**Before:**
```javascript
const response = await fetch('/api/ai/analyze', {
  method: 'POST',
  body: JSON.stringify({ url, htmlContent })
});
```

**After:**
```javascript
const response = await fetch('/api/agents/analyzer/complete', {
  method: 'POST',
  body: JSON.stringify({ 
    prompt: `Analyze this URL: ${url}`,
    system: "You are a web content analyzer..."
  })
});
```

## Deployment Notes

### Cloud Run Configuration

```bash
gcloud run deploy agentes-api \
  --image gcr.io/PROJECT_ID/agentes-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GOOGLE_GENERATIVE_AI_API_KEY=GOOGLE_GENERATIVE_AI_API_KEY:latest \
  --update-env-vars MODEL_NAME=gemini-2.5-flash,AI_TEMPERATURE=0.3,MAX_OUTPUT_TOKENS=2048
```

### Canary Deployment

```bash
# Deploy new version with 10% traffic
gcloud run services update-traffic agentes-api \
  --region us-central1 \
  --to-latest=10 \
  --platform managed
```

### Rollback

```bash
# Rollback to previous version
gcloud run services update-traffic agentes-api \
  --region us-central1 \
  --to-revisions=PREVIOUS_REVISION=100 \
  --platform managed
```

## Monitoring and Observability

- All requests are logged with structured JSON format
- Processing times are tracked for performance monitoring
- Token usage is reported for cost tracking
- Error rates and response times can be monitored via logs
- Rate limiting events are logged for capacity planning

## Performance Considerations

- **Complete endpoint**: ~1-3 seconds for typical prompts
- **Chat streaming**: First chunk in ~500ms, full response in 2-5 seconds
- **Object extraction**: ~1-2 seconds for structured data
- **Rate limits**: Designed to prevent abuse while allowing normal usage
- **Token limits**: Configurable via environment variables

## Future Enhancements

- [ ] Add function calling support
- [ ] Implement conversation memory
- [ ] Add more predefined schemas
- [ ] Implement request queuing for high load
- [ ] Add metrics export to monitoring systems
- [ ] Support for multiple model providers