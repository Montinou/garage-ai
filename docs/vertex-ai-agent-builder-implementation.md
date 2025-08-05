# Vertex AI Agent Builder Implementation Plan
## Production-Ready AI Agents for Vehicle Data Extraction

### Project: Garage AI - Vehicle Scraping System
**Google Cloud Project**: `analog-medium-451706-m7`  
**Implementation Date**: January 2025  
**Approach**: Vertex AI Agent Builder + Agent Development Kit (ADK)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    VERTEX AI AGENT BUILDER SYSTEM                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    VERCEL PRO (Orchestration)                    │  │
│  │                                                                  │  │
│  │  • Next.js Dashboard                                            │  │
│  │  • Cron Jobs (Job Scheduling)                                   │  │
│  │  • API Routes (Agent Communication)                             │  │
│  │  • Database Operations (Neon)                                   │  │
│  │                                                                  │  │
│  └─────────────────────────┬────────────────────────────────────────┘  │
│                            │                                            │
│                            ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              VERTEX AI AGENT BUILDER                            │  │
│  │                                                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │  │
│  │  │   ANALYZER      │  │   EXTRACTOR     │  │   VALIDATOR     │ │  │
│  │  │     AGENT       │  │     AGENT       │  │     AGENT       │ │  │
│  │  │                 │  │                 │  │                 │ │  │
│  │  │ • Gemini 1.5    │  │ • Gemini 1.5    │  │ • Gemini 1.5    │ │  │
│  │  │ • Web Analysis  │  │ • Data Extract  │  │ • Quality Check │ │  │
│  │  │ • Structure ID  │  │ • Multi-modal   │  │ • Validation    │ │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘ │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────────┐ │  │
│  │  │                    AGENT TOOLS                              │ │  │
│  │  │  • Grounding with Google Search                             │ │  │
│  │  │  • Code Execution                                           │ │  │
│  │  │  • RAG Engine (Vehicle Knowledge Base)                     │ │  │
│  │  │  • Custom Web Scraping Tools                               │ │  │
│  │  └─────────────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                            │                                            │
│                            ▼                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    NEON DATABASE                                 │  │
│  │   • Agent Jobs & Results                                        │  │
│  │   • Vehicle Data Storage                                        │  │
│  │   • System Metrics                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Enable Vertex AI Agent Builder

```bash
# Enable required APIs
gcloud services enable \
  aiplatform.googleapis.com \
  dialogflow.googleapis.com \
  generativeai.googleapis.com \
  discoveryengine.googleapis.com

# Set up Agent Builder
gcloud config set project analog-medium-451706-m7
gcloud config set ai/region us-central1
```

### Phase 2: Create AI Agents

#### 2.1 Analyzer Agent Configuration

```python
# agent_configs/analyzer_agent.py
from vertexai.preview.agent_builder import Agent, Tool

analyzer_agent = Agent(
    display_name="Vehicle Analyzer Agent",
    description="Analyzes web pages to identify vehicle data structure and extraction patterns",
    agent_type="ANALYZER",
    llm_model="gemini-1.5-flash-002",
    tools=[
        Tool(
            name="web_content_analyzer",
            description="Analyzes HTML content to identify vehicle data fields and selectors"
        ),
        Tool(
            name="structure_identifier", 
            description="Identifies page structure patterns for data extraction"
        ),
        Tool(
            name="anti_bot_detector",
            description="Detects anti-bot measures and recommends bypass strategies"
        )
    ],
    instructions="""
    You are an expert web content analyzer specializing in vehicle listing websites.
    
    Your tasks:
    1. Analyze HTML content to identify vehicle data locations
    2. Generate CSS selectors and XPath expressions for data extraction
    3. Detect challenges like JavaScript rendering and anti-bot measures
    4. Recommend optimal extraction strategies
    5. Provide confidence scores for successful extraction
    
    Always respond with structured JSON containing:
    - pageStructure: Data field locations and selectors
    - challenges: Potential extraction difficulties
    - confidence: Success probability (0-1)
    - extractionMethod: Recommended approach (dom/api/ocr)
    - estimatedTime: Processing time estimate
    """
)
```

#### 2.2 Extractor Agent Configuration

```python
# agent_configs/extractor_agent.py
extractor_agent = Agent(
    display_name="Vehicle Data Extractor Agent",
    description="Extracts structured vehicle data from web content using multi-modal AI",
    agent_type="EXTRACTOR", 
    llm_model="gemini-1.5-flash-002",
    tools=[
        Tool(
            name="text_extractor",
            description="Extracts vehicle data from text content"
        ),
        Tool(
            name="image_analyzer", 
            description="Analyzes vehicle images for additional data points"
        ),
        Tool(
            name="data_normalizer",
            description="Normalizes and structures extracted data"
        )
    ],
    instructions="""
    You are an expert data extractor for vehicle listings.
    
    Extract these vehicle data fields:
    - make, model, year (required)
    - price, mileage (required)
    - VIN, condition, features, description
    - seller info, location, images, listing date
    
    Processing rules:
    1. Convert text numbers to integers (e.g., "25,000" → 25000)
    2. Standardize formats (prices in USD, mileage in miles)
    3. Validate data consistency
    4. Handle missing data gracefully
    
    Always respond with structured JSON following the vehicle data schema.
    """
)
```

#### 2.3 Validator Agent Configuration

```python
# agent_configs/validator_agent.py
validator_agent = Agent(
    display_name="Vehicle Data Validator Agent", 
    description="Validates quality and accuracy of extracted vehicle data",
    agent_type="VALIDATOR",
    llm_model="gemini-1.5-flash-002",
    tools=[
        Tool(
            name="completeness_checker",
            description="Checks data completeness and missing fields"
        ),
        Tool(
            name="accuracy_validator",
            description="Validates data accuracy and realistic values"
        ),
        Tool(
            name="duplicate_detector", 
            description="Detects potential duplicate listings"
        ),
        Tool(
            name="quality_scorer",
            description="Generates overall quality scores"
        )
    ],
    instructions="""
    You are a data quality specialist for vehicle listings.
    
    Validation checks:
    1. COMPLETENESS: Required fields present (make, model, year, price)
    2. ACCURACY: Realistic values (price range, mileage vs age)
    3. CONSISTENCY: Matching features and descriptions
    4. DUPLICATES: VIN matches, similar specs/pricing
    5. QUALITY: Overall data reliability score (0-100)
    
    Provide detailed validation results with:
    - isValid: boolean
    - completeness, accuracy: scores (0-1)
    - issues: specific problems found
    - qualityScore: overall score (0-100)
    - isDuplicate: boolean
    """
)
```

### Phase 3: Agent Tools and RAG Integration

#### 3.1 Vehicle Knowledge Base (RAG)

```python
# tools/vehicle_knowledge_base.py
from vertexai.preview.agent_builder import DataStore

vehicle_datastore = DataStore(
    display_name="Vehicle Knowledge Base",
    content_config={
        "data_sources": [
            {
                "name": "vehicle_makes_models",
                "type": "structured_data",
                "schema": {
                    "make": "string",
                    "model": "string", 
                    "years": "array",
                    "typical_features": "array",
                    "price_ranges": "object"
                }
            },
            {
                "name": "automotive_terminology",
                "type": "unstructured_data",
                "content": "Vehicle specifications, features, and industry terms"
            }
        ]
    }
)
```

#### 3.2 Web Scraping Tools

```python
# tools/web_scraping_tools.py
def create_scraping_tools():
    return [
        Tool(
            name="html_fetcher",
            description="Fetches HTML content from vehicle listing URLs",
            function_declarations=[{
                "name": "fetch_page_content",
                "description": "Retrieves HTML content from a URL with proper headers",
                "parameters": {
                    "type": "object", 
                    "properties": {
                        "url": {"type": "string"},
                        "user_agent": {"type": "string"},
                        "headers": {"type": "object"}
                    }
                }
            }]
        ),
        Tool(
            name="image_processor",
            description="Downloads and processes vehicle images",
            function_declarations=[{
                "name": "process_vehicle_images",
                "description": "Downloads, optimizes and analyzes vehicle images",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "image_urls": {"type": "array"},
                        "max_images": {"type": "integer"}
                    }
                }
            }]
        )
    ]
```

### Phase 4: Vercel Integration Layer

#### 4.1 Agent Communication API

```typescript
// app/api/agents/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';

interface AgentRequest {
  agentType: 'analyzer' | 'extractor' | 'validator';
  payload: any;
  jobId: string;
}

export async function POST(request: NextRequest) {
  try {
    const { agentType, payload, jobId }: AgentRequest = await request.json();
    
    // Call Vertex AI Agent Builder
    const agentResponse = await callVertexAIAgent(agentType, payload);
    
    // Store result in Neon database
    await storeAgentResult(jobId, agentType, agentResponse);
    
    return NextResponse.json({
      success: true,
      result: agentResponse,
      jobId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Agent call failed:', error);
    return NextResponse.json(
      { error: 'Agent processing failed' },
      { status: 500 }
    );
  }
}

async function callVertexAIAgent(agentType: string, payload: any) {
  const agentEndpoint = getAgentEndpoint(agentType);
  
  const response = await fetch(agentEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: JSON.stringify(payload) }]
      }]
    })
  });
  
  return await response.json();
}
```

#### 4.2 Cron Job Orchestration

```typescript
// app/api/cron/process-jobs/route.ts
export async function GET() {
  try {
    console.log('🔄 Processing agent jobs...');
    
    // Get pending jobs from database
    const pendingJobs = await getPendingJobs();
    
    for (const job of pendingJobs) {
      try {
        // Route to appropriate agent
        const result = await processJobWithAgent(job);
        
        // Update job status
        await updateJobStatus(job.id, 'completed', result);
        
        console.log(`✅ Job ${job.id} completed by ${job.agentType}`);
        
      } catch (error) {
        await updateJobStatus(job.id, 'failed', { error: error.message });
        console.error(`❌ Job ${job.id} failed:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      processed: pendingJobs.length 
    });
    
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json(
      { error: 'Cron processing failed' },
      { status: 500 }
    );
  }
}
```

### Phase 5: Deployment Configuration

#### 5.1 Vercel Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/agents/**": {
      "maxDuration": 300
    }
  },
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "*/2 * * * *"
    },
    {
      "path": "/api/cron/health-check", 
      "schedule": "*/10 * * * *"
    },
    {
      "path": "/api/cron/cleanup-completed",
      "schedule": "0 */6 * * *"
    }
  ],
  "env": {
    "GOOGLE_CLOUD_PROJECT": "analog-medium-451706-m7",
    "VERTEX_AI_LOCATION": "us-central1"
  }
}
```

#### 5.2 Environment Variables

```bash
# Vercel Environment Variables
GOOGLE_CLOUD_PROJECT=analog-medium-451706-m7
VERTEX_AI_LOCATION=us-central1
VERTEX_AI_ANALYZER_AGENT_ID=projects/analog-medium-451706-m7/locations/us-central1/agents/analyzer-001
VERTEX_AI_EXTRACTOR_AGENT_ID=projects/analog-medium-451706-m7/locations/us-central1/agents/extractor-001  
VERTEX_AI_VALIDATOR_AGENT_ID=projects/analog-medium-451706-m7/locations/us-central1/agents/validator-001

# Database (already configured)
DATABASE_URL=postgres://neondb_owner:...
EDGE_CONFIG=https://edge-config.vercel.com/...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
GOOGLE_AI_API_KEY=AIzaSyB6zKUEHCtqtt6rcR4N5uSM6XVaugYVRlQ
```

## Cost Optimization

### Expected Monthly Costs (10,000 vehicle extractions)

```
Vertex AI Agent Builder:
- Agent calls (3 agents × 10k calls): ~$45-60
- Gemini 1.5 Flash usage: ~$20-30
- Data storage (RAG): ~$5-10

Vercel Pro:
- Cron jobs: FREE (under limits)
- API routes: FREE (under 1GB)
- Edge functions: FREE (under 500k)

Neon Database:
- PostgreSQL: FREE (under 3GB)

Total: ~$70-100/month
```

## Next Steps

1. **Enable Vertex AI Agent Builder APIs** ✅
2. **Create the 3 AI agents** (Analyzer, Extractor, Validator)
3. **Set up vehicle knowledge base (RAG)**
4. **Implement Vercel API integration**
5. **Configure cron jobs**
6. **Test end-to-end workflow**
7. **Deploy to production**

This approach leverages Google's recommended Agent Builder platform while using Vercel Pro for cost-effective orchestration, providing a production-ready, scalable solution for vehicle data extraction.

---

**Status**: 🚀 Ready to implement using Vertex AI Agent Builder!