# 🛠️ Stack Tecnológico

## Tecnologías y Servicios Utilizados

### 🎨 Frontend - Vercel & Next.js

#### **Framework Principal**
- **Next.js 15**: Con App Router para máximo rendimiento
- **React 19**: Última versión con mejoras de performance
- **TypeScript**: Type safety en todo el proyecto
- **Tailwind CSS v4**: Sistema de diseño moderno
- **shadcn/ui**: Componentes UI de alta calidad

#### **Características Clave**
```json
{
  "rendering": "Edge Runtime + SSR",
  "caching": "ISR + On-demand Revalidation",
  "optimization": "Image Optimization + Font Loading",
  "analytics": "Vercel Analytics + Web Vitals"
}
```

#### **Componentes Principales**
```typescript
// Estructura de componentes
components/
├── ui/                 // shadcn/ui components
├── agents/             // Visualización de agentes
├── dashboard/          // Dashboard components
├── scraping/           // Controles de scraping
└── analytics/          // Gráficos y métricas
```

### ☁️ Backend - Edge Functions & Cloud Run

#### **Vercel Edge Functions**
```typescript
// API Routes con Edge Runtime
export const runtime = 'edge';

export async function POST(request: Request) {
  // Orquestación de agentes
  const job = await request.json();
  
  // Enqueue al sistema de procesamiento
  const result = await orchestrator.process(job);
  
  return Response.json(result);
}
```

#### **Google Cloud Run**
- **Containerización**: Docker images optimizadas
- **Auto-scaling**: 0 a 1000 instancias
- **Cold start**: < 1 segundo
- **Concurrencia**: 1000 requests por instancia

```dockerfile
# Dockerfile optimizado
FROM node:20-alpine AS base
RUN apk add --no-cache chromium
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

FROM base AS app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["node", "server.js"]
```

### 🤖 Inteligencia Artificial

#### **Claude API (Anthropic)**
```typescript
// Configuración de Claude
const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Uso para análisis profundo
async function analyzeWithClaude(content: string) {
  const response = await claude.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: content
    }]
  });
  
  return response.content[0].text;
}
```

#### **DeepInfra - Modelos Open Source**
```typescript
// Configuración DeepInfra
const deepinfra = {
  baseURL: 'https://api.deepinfra.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.DEEPINFRA_API_KEY}`
  }
};

// Modelos disponibles
const models = {
  llama2_70b: 'meta-llama/Llama-2-70b-chat-hf',
  codellama: 'codellama/CodeLlama-34b-Instruct-hf',
  mixtral: 'mistralai/Mixtral-8x7B-Instruct-v0.1'
};
```

### 🗄️ Base de Datos - Supabase

#### **PostgreSQL**
```sql
-- Esquema principal
CREATE SCHEMA garage_ai;

-- Tablas principales
CREATE TABLE garage_ai.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id INTEGER REFERENCES brands(id),
    model_id INTEGER REFERENCES models(id),
    price NUMERIC(12, 2),
    year INTEGER,
    mileage INTEGER,
    ai_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices optimizados
CREATE INDEX idx_vehicles_search ON vehicles 
  USING GIN (to_tsvector('spanish', title || ' ' || description));
```

#### **Realtime Subscriptions**
```typescript
// Suscripción a cambios en tiempo real
const subscription = supabase
  .channel('vehicles-changes')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'vehicles' 
    },
    (payload) => {
      console.log('Change received!', payload);
      updateUI(payload);
    }
  )
  .subscribe();
```

### 🔍 Vector Database - Pinecone

#### **Configuración**
```typescript
import { PineconeClient } from '@pinecone-database/pinecone';

const pinecone = new PineconeClient();
await pinecone.init({
  apiKey: process.env.PINECONE_API_KEY,
  environment: 'us-east-1'
});

const index = pinecone.Index('garage-ai-patterns');
```

#### **Uso para Patrones**
```typescript
// Almacenar patrón exitoso
async function storePattern(pattern: ScrapingPattern) {
  const embedding = await generateEmbedding(pattern);
  
  await index.upsert({
    upsertRequest: {
      vectors: [{
        id: pattern.id,
        values: embedding,
        metadata: {
          domain: pattern.domain,
          successRate: pattern.successRate,
          lastUsed: new Date().toISOString()
        }
      }]
    }
  });
}

// Buscar patrones similares
async function findSimilarPatterns(query: string, k: number = 5) {
  const queryEmbedding = await generateEmbedding(query);
  
  const results = await index.query({
    queryRequest: {
      vector: queryEmbedding,
      topK: k,
      includeMetadata: true
    }
  });
  
  return results.matches;
}
```

### 🌐 Web Scraping - Playwright

#### **Configuración Optimizada**
```typescript
import { chromium } from 'playwright';

const browserConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ]
};

// Pool de browsers
class BrowserPool {
  private pool: Browser[] = [];
  private maxSize = 5;
  
  async acquire(): Promise<Browser> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    return await chromium.launch(browserConfig);
  }
  
  async release(browser: Browser) {
    if (this.pool.length < this.maxSize) {
      this.pool.push(browser);
    } else {
      await browser.close();
    }
  }
}
```

### 🔐 Proxies y Captcha Solving

#### **ScrapingBee Integration**
```typescript
const scrapingBee = {
  apiKey: process.env.SCRAPINGBEE_API_KEY,
  baseURL: 'https://app.scrapingbee.com/api/v1'
};

async function scrapeWithProxy(url: string) {
  const response = await fetch(`${scrapingBee.baseURL}/?` + 
    new URLSearchParams({
      api_key: scrapingBee.apiKey,
      url: url,
      render_js: 'true',
      premium_proxy: 'true',
      country_code: 'ar'
    })
  );
  
  return await response.text();
}
```

### 📊 Monitoreo y Analytics

#### **Vercel Analytics**
```typescript
// Tracking de eventos personalizados
import { track } from '@vercel/analytics';

track('scraping_completed', {
  source: 'mercadolibre',
  items: 150,
  duration: 45.2,
  success_rate: 0.98
});
```

#### **Sentry para Error Tracking**
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ]
});
```

### 🚀 DevOps y CI/CD

#### **GitHub Actions**
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: vercel/action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          
      - name: Deploy Cloud Run Services
        uses: google-github-actions/deploy-cloudrun@v1
        with:
          service: garage-ai-agents
          image: gcr.io/${{ secrets.GCP_PROJECT }}/garage-ai:${{ github.sha }}
```

### 🔧 Herramientas de Desarrollo

#### **Testing**
- **Playwright Test**: E2E testing
- **Vitest**: Unit testing
- **React Testing Library**: Component testing
- **MSW**: API mocking

#### **Linting y Formatting**
- **ESLint**: Configuración estricta
- **Prettier**: Formateo consistente
- **Husky**: Git hooks
- **lint-staged**: Pre-commit checks

### 📦 Dependencias Principales

```json
{
  "dependencies": {
    "next": "15.2.4",
    "react": "^19",
    "@anthropic-ai/sdk": "^0.24.0",
    "@supabase/supabase-js": "^2.53.0",
    "@pinecone-database/pinecone": "^2.0.0",
    "playwright": "^1.54.2",
    "@vercel/analytics": "^1.3.0",
    "lucide-react": "^0.454.0",
    "recharts": "2.15.4",
    "zod": "3.25.67"
  }
}
```

---

*Siguiente: [Implementación →](./04-implementacion.md)*