# Vertex AI Integration Plan - Garage AI Production System

## Project Configuration

**Google Cloud Project**: `analog-medium-451706-m7`  
**Owner**: agusmontoya@gmail.com  
**Region**: `us-central1` (primary), `us-west1` (backup)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────┐       ┌─────────────────────────────────────┐   │
│  │   Vercel App     │       │      Google Cloud Platform          │   │
│  │                  │       │                                     │   │
│  │  • Next.js UI    │       │  ┌─────────────────────────────┐   │   │
│  │  • API Routes    │◄─────►│  │    Cloud Run Services       │   │   │
│  │  • Cron Jobs     │       │  │                             │   │   │
│  │  • Edge Functions│       │  │  • AI Agent Orchestrator    │   │   │
│  │                  │       │  │  • Vertex AI Integration    │   │   │
│  └──────────────────┘       │  │  • Real-time Processing     │   │   │
│           │                  │  └─────────────────────────────┘   │   │
│           │                  │               │                     │   │
│           │                  │               ▼                     │   │
│           │                  │  ┌─────────────────────────────┐   │   │
│           │                  │  │      Vertex AI Models       │   │   │
│           │                  │  │                             │   │   │
│           │                  │  │  • Gemini 1.5 Pro          │   │   │
│           ▼                  │  │  • Gemini 1.5 Flash        │   │   │
│  ┌──────────────────┐       │  │  • Text Embeddings         │   │   │
│  │   Neon Database  │       │  │  • Vision AI               │   │   │
│  │   (PostgreSQL)   │       │  └─────────────────────────────┘   │   │
│  └──────────────────┘       └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Phase 1: Infrastructure Setup - NOW EXECUTING

### 1.1 Create Service Account

```bash
# Create service account for Cloud Run services
gcloud iam service-accounts create garage-ai-runner \
  --display-name="Garage AI Production Service Account" \
  --description="Service account for Garage AI agents on Cloud Run"

# Grant necessary permissions
gcloud projects add-iam-policy-binding analog-medium-451706-m7 \
  --member="serviceAccount:garage-ai-runner@analog-medium-451706-m7.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding analog-medium-451706-m7 \
  --member="serviceAccount:garage-ai-runner@analog-medium-451706-m7.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding analog-medium-451706-m7 \
  --member="serviceAccount:garage-ai-runner@analog-medium-451706-m7.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

**Status**: 🚀 Ready for production deployment!