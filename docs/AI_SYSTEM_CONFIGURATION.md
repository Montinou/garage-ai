# Garage AI - AI System Configuration Guide

## Overview

This document provides complete instructions for configuring the AI-powered agent system for deployment on Google Cloud Run with Vercel frontend integration.

## Required Environment Variables

### Core AI Configuration

```bash
# Primary AI Provider (Choose one)
OPENAI_API_KEY="sk-..."                    # OpenAI GPT models
ANTHROPIC_API_KEY="sk-ant-..."            # Claude models  
GOOGLE_AI_API_KEY="AIza..."               # Google Gemini (already configured)

# AI Model Configuration
AI_PRIMARY_MODEL="gpt-4o"                 # Primary model for complex tasks
AI_SECONDARY_MODEL="gpt-4o-mini"          # Faster model for simple tasks
AI_VISION_MODEL="gpt-4o"                  # Model for image analysis
AI_EMBEDDING_MODEL="text-embedding-3-small" # Text embeddings

# AI Behavior Settings
AI_MAX_TOKENS=4000                        # Maximum tokens per request
AI_TEMPERATURE=0.3                        # Creativity level (0-1)
AI_TIMEOUT_MS=30000                       # Request timeout
AI_RETRY_ATTEMPTS=3                       # Retry failed requests
```

### Database Configuration (Already Set)

```bash
# Neon Database (Production Ready)
DATABASE_URL="postgres://neondb_owner:...@ep-dry-morning-acb0oznd-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:...@ep-dry-morning-acb0oznd.sa-east-1.aws.neon.tech/neondb?sslmode=require"
NEON_PROJECT_ID="polished-hat-80176272"
```

### Vercel Integration (Already Set)

```bash
# Vercel Services
EDGE_CONFIG="https://edge-config.vercel.com/ecfg_vifbx1ghivjcymdyqbbljeyfrlst?token=..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
NEXT_PUBLIC_STACK_PROJECT_ID="04cc720e-a80c-4d15-8d4e-533b44b7294f"
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY="pck_..."
```

### Additional Services (Optional)

```bash
# Web Scraping Enhancement
PROXY_URL="http://proxy-provider.com:port"     # Rotating proxy service
USER_AGENT_SERVICE="browserless.io"           # Browser automation service
CAPTCHA_SOLVER_KEY="..."                       # 2captcha or similar service

# Monitoring & Analytics
SENTRY_DSN="https://..."                       # Error tracking
POSTHOG_API_KEY="phc_..."                     # Analytics
VERCEL_ANALYTICS_ID="..."                     # Vercel Analytics

# External APIs
RAPIDAPI_KEY="..."                            # For vehicle data APIs
VEHICLE_DATABASE_API="..."                    # Vehicle specification API
```

## AI Agent System Architecture

### 1. AI Service Layer

```typescript
// lib/ai/ai-service.ts
export class AIService {
  // Orchestrator AI: Plans and coordinates workflows
  async planWorkflow(request: OrchestrationRequest): Promise<WorkflowPlan>
  
  // Explorer AI: Analyzes websites and discovers content  
  async analyzeSiteStructure(url: string): Promise<SiteAnalysis>
  
  // Analyzer AI: Understands page content and extraction strategy
  async analyzeContent(html: string, images: string[]): Promise<ContentAnalysis>
  
  // Extractor AI: Intelligently extracts vehicle data
  async extractVehicleData(content: string): Promise<VehicleData>
  
  // Validator AI: Quality checks and data validation
  async validateData(data: VehicleData): Promise<ValidationResult>
}
```

### 2. Agent AI Integration Points

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI-POWERED AGENT FLOW                       │
└─────────────────────────────────────────────────────────────────────┘

INPUT: "Scrape vehicles from autotrader.com"
   │
   ▼
┌─────────────────┐    ┌─────────────────────────────────────────────┐
│  ORCHESTRATOR   │◄──►│ AI: "Analyze site, plan multi-step         │
│     AGENT       │    │      workflow, estimate resources"         │
└─────────────────┘    └─────────────────────────────────────────────┘
   │ Plans: [explore → analyze → extract → validate]
   ▼
┌─────────────────┐    ┌─────────────────────────────────────────────┐
│   EXPLORER      │◄──►│ AI: "Map site structure, identify vehicle  │
│     AGENT       │    │      listing pages, detect anti-bot"       │
└─────────────────┘    └─────────────────────────────────────────────┘
   │ Found: 1,247 vehicle listing URLs
   ▼
┌─────────────────┐    ┌─────────────────────────────────────────────┐
│   ANALYZER      │◄──►│ AI: "Analyze HTML structure, identify      │
│     AGENT       │    │      data patterns, plan extraction"       │
└─────────────────┘    └─────────────────────────────────────────────┘
   │ Strategy: Extract via CSS selectors + OCR for images
   ▼
┌─────────────────┐    ┌─────────────────────────────────────────────┐
│   EXTRACTOR     │◄──►│ AI: "Extract make/model/price/features,    │
│     AGENT       │    │      process images, normalize data"       │
└─────────────────┘    └─────────────────────────────────────────────┘
   │ Extracted: 1,247 vehicle records
   ▼
┌─────────────────┐    ┌─────────────────────────────────────────────┐
│   VALIDATOR     │◄──►│ AI: "Validate completeness, check quality, │
│     AGENT       │    │      detect duplicates, score accuracy"    │
└─────────────────┘    └─────────────────────────────────────────────┘
   │
   ▼
OUTPUT: Clean, validated vehicle dataset ready for use
```

## Deployment Configuration

### Step 1: Google Cloud Run Setup

```bash
# 1. Create Google Cloud Project
gcloud projects create garage-ai-system
gcloud config set project garage-ai-system

# 2. Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable secretmanager.googleapis.com

# 3. Create service account
gcloud iam service-accounts create garage-ai-runner \
  --display-name="Garage AI Service Account"

# 4. Grant necessary permissions
gcloud projects add-iam-policy-binding garage-ai-system \
  --member="serviceAccount:garage-ai-runner@garage-ai-system.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### Step 2: Environment Variables in Google Cloud

```bash
# Store secrets in Google Secret Manager
gcloud secrets create openai-api-key --data-file=<(echo -n "$OPENAI_API_KEY")
gcloud secrets create anthropic-api-key --data-file=<(echo -n "$ANTHROPIC_API_KEY")
gcloud secrets create database-url --data-file=<(echo -n "$DATABASE_URL")

# Create Cloud Run service with environment variables
gcloud run deploy garage-ai-agents \
  --image=gcr.io/garage-ai-system/agents:latest \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,AI_PRIMARY_MODEL=gpt-4o" \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest" \
  --set-secrets="DATABASE_URL=database-url:latest" \
  --memory=2Gi \
  --cpu=2 \
  --concurrency=80 \
  --timeout=300
```

### Step 3: Vercel Environment Variables

In your Vercel dashboard, configure these environment variables:

```bash
# Production Environment
NODE_ENV=production

# AI Configuration  
OPENAI_API_KEY=sk-proj-...                   # ← SET THIS
ANTHROPIC_API_KEY=sk-ant-...                # ← SET THIS (optional)
AI_PRIMARY_MODEL=gpt-4o
AI_SECONDARY_MODEL=gpt-4o-mini
AI_VISION_MODEL=gpt-4o
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.3

# Database (Already configured)
DATABASE_URL=postgres://neondb_owner:...
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:...
NEON_PROJECT_ID=polished-hat-80176272

# Vercel Services (Already configured)
EDGE_CONFIG=https://edge-config.vercel.com/...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
NEXT_PUBLIC_STACK_PROJECT_ID=04cc720e-...
NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY=pck_...

# Google Cloud Integration
GOOGLE_CLOUD_PROJECT=garage-ai-system        # ← SET THIS
CLOUD_RUN_SERVICE_URL=https://garage-ai-agents-...-uc.a.run.app # ← SET THIS
```

## AI Model Configuration Guide

### Recommended Model Setup

```typescript
// lib/ai/models.ts
export const AI_MODELS = {
  // For complex reasoning and planning (Orchestrator)
  ORCHESTRATOR: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 2000
  },
  
  // For content analysis (Analyzer) 
  ANALYZER: {
    provider: 'openai', 
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 3000
  },
  
  // For data extraction (Extractor)
  EXTRACTOR: {
    provider: 'openai',
    model: 'gpt-4o-mini', // Faster for structured tasks
    temperature: 0.1,
    max_tokens: 1500
  },
  
  // For validation (Validator)
  VALIDATOR: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.0, // Most deterministic
    max_tokens: 1000
  },
  
  // For vision tasks (image analysis)
  VISION: {
    provider: 'openai',
    model: 'gpt-4o',
    temperature: 0.2,
    max_tokens: 1500
  }
};
```

### Cost Optimization Strategy

```typescript
// Estimated monthly costs for 10,000 vehicle extractions:
const COST_ESTIMATES = {
  'gpt-4o': '$150-200/month',        // Complex reasoning
  'gpt-4o-mini': '$30-50/month',     // Simple tasks  
  'claude-3-haiku': '$25-40/month',  // Alternative fast model
  'gemini-pro': '$20-35/month'       // Google's model (free tier available)
};
```

## System Configuration Files

### 1. AI Service Configuration

```typescript
// lib/ai/config.ts
export const AI_CONFIG = {
  providers: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      baseURL: 'https://api.openai.com/v1',
      timeout: 30000,
      maxRetries: 3
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: 'https://api.anthropic.com',
      timeout: 30000,
      maxRetries: 3
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY!,
      timeout: 30000,
      maxRetries: 3
    }
  },
  
  fallbackStrategy: {
    primary: 'openai',
    secondary: 'google',
    tertiary: 'anthropic'
  },
  
  rateLimits: {
    openai: { rpm: 3000, tpm: 150000 },
    anthropic: { rpm: 1000, tpm: 100000 },
    google: { rpm: 1500, tpm: 32000 }
  }
};
```

### 2. Agent Prompts

```typescript
// lib/ai/prompts.ts
export const AGENT_PROMPTS = {
  ORCHESTRATOR: `You are an AI orchestrator for a vehicle scraping system. 
Plan efficient workflows to extract vehicle data from websites.
Consider: site structure, rate limits, anti-bot measures, data volume.
Respond with structured workflow plans.`,

  EXPLORER: `You are an AI web explorer. Analyze website structure to find vehicle listings.
Identify: navigation patterns, URL structures, pagination, content types.
Detect anti-bot measures and recommend strategies.
Respond with structured site analysis.`,

  ANALYZER: `You are an AI content analyzer. Examine web pages to understand data layout.
Identify: data fields, extraction methods, content patterns, image locations.
Plan optimal extraction strategies for vehicle information.
Respond with detailed extraction plans.`,

  EXTRACTOR: `You are an AI data extractor. Extract vehicle information from web content.
Extract: make, model, year, price, mileage, features, description, images.
Handle various formats: HTML, JSON, text, images.
Respond with structured vehicle data.`,

  VALIDATOR: `You are an AI data validator. Verify quality and completeness of vehicle data.
Check: data accuracy, completeness, formatting, duplicates, anomalies.
Score data quality and suggest improvements.
Respond with validation results and quality scores.`
};
```

## Deployment Checklist

### Pre-Deployment Setup

- [ ] **OpenAI API Key**: Obtained and tested
- [ ] **Google Cloud Project**: Created and configured  
- [ ] **Neon Database**: Already configured ✅
- [ ] **Vercel Project**: Connected to repository
- [ ] **Environment Variables**: Set in both Vercel and Cloud Run
- [ ] **Docker Image**: Built and pushed to Google Container Registry

### Deployment Steps

1. **Deploy to Google Cloud Run**:
   ```bash
   # Build and deploy the agent services
   gcloud run deploy garage-ai-agents --source .
   ```

2. **Deploy to Vercel**:
   ```bash
   # Deploy the Next.js dashboard
   vercel --prod
   ```

3. **Verify Integration**:
   ```bash
   # Test the complete system
   curl https://your-vercel-app.vercel.app/api/agents/health
   ```

### Post-Deployment Validation

- [ ] **Health Checks**: All agents responding
- [ ] **Database Connection**: Neon integration working
- [ ] **AI APIs**: OpenAI/Google calls successful
- [ ] **Cross-Service Communication**: Vercel ↔ Cloud Run working
- [ ] **Monitoring**: Logs and metrics collecting
- [ ] **Error Handling**: Fallback systems operational

## Monitoring & Maintenance

### Key Metrics to Monitor

```typescript
// Monitoring dashboard should track:
const METRICS = {
  aiApiCalls: 'Number of AI API requests',
  aiApiCost: 'Monthly AI API costs',
  extractionSuccess: 'Successful vehicle extractions',
  extractionAccuracy: 'Data quality scores',
  systemLatency: 'End-to-end processing time',
  errorRates: 'Failed requests by agent type'
};
```

### Alerting Thresholds

```typescript
const ALERTS = {
  aiApiCost: '$200/month',           // Cost threshold
  errorRate: '5%',                   // Error rate threshold  
  latency: '30 seconds',             // Response time threshold
  successRate: '95%'                 // Minimum success rate
};
```

---

## Quick Start Commands

Once all environment variables are set:

```bash
# 1. Deploy to Google Cloud Run
gcloud run deploy garage-ai-agents --source . --region us-central1

# 2. Deploy to Vercel  
vercel --prod

# 3. Test the system
curl https://your-app.vercel.app/api/agents/orchestrate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"target": "autotrader.com", "type": "vehicle_scraping"}'
```

**Status**: 🚀 Ready for deployment once environment variables are configured!