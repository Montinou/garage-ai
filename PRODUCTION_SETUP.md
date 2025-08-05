# Production Setup Guide: Local Agent Pipeline

This guide shows how to deploy and run the automated scraping system using local Vertex AI agents in production.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Sources   │───▶│   Scraper API    │───▶│   Local Agents  │
│  (MercadoLibre, │    │   /api/scraping/ │    │   (Vertex AI)   │
│   AutoCosmos)   │    │     pipeline     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Database      │◀───│   AI Pipeline    │───▶│   Validation    │
│   (Neon)        │    │   Analyze ──▶    │    │   & Quality     │
│                 │    │   Extract ──▶    │    │   Scoring       │
└─────────────────┘    │   Validate       │    └─────────────────┘
                       └──────────────────┘
```

## 🚀 Quick Start

### 1. Deploy to Production

```bash
# Deploy to Vercel
vercel --prod

# Or build locally
npm run build
npm start
```

### 2. Configure Environment Variables

```bash
# Required for Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
VERTEX_AI_PROJECT=analog-medium-451706-m7
VERTEX_AI_LOCATION=us-central1

# Database (Neon)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Optional: Webhook notifications
WEBHOOK_URL=https://your-webhook.com/scraping-results
```

### 3. Set Up Cron Jobs (Vercel)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scraping-scheduler",
      "schedule": "0 */2 * * *"
    },
    {
      "path": "/api/cron/process-jobs", 
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## 📋 Usage Examples

### 1. API-Based Scraping

```bash
# Process URLs immediately
curl -X POST https://your-app.vercel.app/api/scraping/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://autos.mercadolibre.com.mx/toyota-corolla/usado",
      "https://autocosmos.com.mx/seminuevos/honda/civic"
    ],
    "config": {
      "qualityThreshold": 75,
      "saveToDatabase": true,
      "batchSize": 5
    }
  }'

# Schedule for later processing
curl -X POST https://your-app.vercel.app/api/scraping/pipeline \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://example.com/car1"],
    "scheduleForLater": true
  }'
```

### 2. JavaScript Integration

```javascript
import { ScraperPipeline } from '@/lib/scraper-pipeline';

const pipeline = new ScraperPipeline({
  qualityThreshold: 80,
  saveToDatabase: true,
  validateBeforeSaving: true
});

// Process single URL
const result = await pipeline.processUrl(
  'https://autos.mercadolibre.com.mx/toyota-corolla', 
  htmlContent
);

// Process multiple URLs
const batchResult = await pipeline.processBatch([
  'https://site1.com/car1',
  'https://site2.com/car2'
]);
```

### 3. Direct Agent Usage

```javascript
import { localAgentService } from '@/lib/agents/local-agent-service';

// Analyze page structure
const analysis = await localAgentService.analyze(url, htmlContent);

// Extract vehicle data
const extraction = await localAgentService.extract(url, htmlContent);

// Validate data quality
const validation = await localAgentService.validate(vehicleData);

// Run complete pipeline
const pipeline = await localAgentService.runPipeline(url, htmlContent);
```

## 🔧 Configuration Options

### Pipeline Configuration

```javascript
const config = {
  batchSize: 10,                    // URLs processed simultaneously
  delayBetweenBatches: 2000,       // Delay in ms between batches
  retryAttempts: 3,                // Retry failed URLs
  qualityThreshold: 70,            // Minimum quality score (0-100)
  saveToDatabase: true,            // Save to database
  validateBeforeSaving: true       // Validate before saving
};
```

### Quality Thresholds

- **90-100**: Excellent - Complete, accurate, consistent data
- **80-89**: Very Good - Minor issues, mostly complete
- **70-79**: Good - Some missing data or minor inconsistencies
- **60-69**: Fair - Significant gaps or precision concerns
- **50-59**: Poor - Major problems, incomplete data
- **0-49**: Very Poor - Unreliable or mostly missing

## 📊 Monitoring & Metrics

### Database Tables

- **`vehicles`**: Extracted vehicle data
- **`agent_jobs`**: Scheduled and completed jobs
- **`agent_metrics`**: Performance metrics
- **`agent_memory`**: Agent state and cache

### Key Metrics

```sql
-- Processing success rate
SELECT 
  COUNT(*) as total_jobs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) * 100 as success_rate
FROM agent_jobs 
WHERE agent_type = 'orchestrator';

-- Quality scores
SELECT 
  AVG(CAST(ai_analysis_summary->>'qualityScore' AS INTEGER)) as avg_quality,
  COUNT(*) as total_vehicles
FROM vehicles 
WHERE ai_analysis_summary IS NOT NULL;

-- Processing times
SELECT 
  metric_name,
  AVG(metric_value) as avg_value,
  MAX(metric_value) as max_value
FROM agent_metrics 
WHERE metric_unit = 'ms'
GROUP BY metric_name;
```

### Dashboard Endpoints

- **`/agents`**: Agent status dashboard
- **`/api/agents/status`**: Agent health check
- **`/api/agents/metrics`**: Performance metrics

## 🛠️ Troubleshooting

### Common Issues

**1. Vertex AI Authentication**
```bash
# Check service account
gcloud auth list

# Set default project
gcloud config set project analog-medium-451706-m7

# Test Vertex AI access
gcloud ai models list --region=us-central1
```

**2. Database Connection**
```javascript
// Test database connection
import { db } from '@/lib/neon';
const result = await db.select().from(vehicles).limit(1);
console.log('Database OK:', result);
```

**3. Memory Issues**
```javascript
// For large batches, use smaller batch sizes
const pipeline = new ScraperPipeline({
  batchSize: 5,  // Reduce from default 10
  delayBetweenBatches: 3000  // Increase delay
});
```

### Performance Optimization

**1. Batch Processing**
- Use appropriate batch sizes (5-10 URLs)
- Add delays between batches (2-5 seconds)
- Monitor memory usage

**2. Quality Filtering**
- Set appropriate quality thresholds
- Skip low-quality data early
- Use validation before database saves

**3. Database Optimization**
- Use database indexes on frequently queried fields
- Archive old data periodically
- Monitor connection pool usage

## 🔄 Automated Scheduling

### Cron Jobs Setup

The system includes two cron jobs:

1. **Scraping Scheduler** (`/api/cron/scraping-scheduler`)
   - Runs every 2 hours
   - Creates scraping jobs from configured sources
   - Manages job priorities and frequencies

2. **Job Processor** (`/api/cron/process-jobs`)
   - Runs every 5 minutes
   - Processes pending agent jobs
   - Updates job status and metrics

### Adding New Sources

Edit `/app/api/cron/scraping-scheduler/route.ts`:

```javascript
const SCRAPING_SOURCES = [
  {
    name: 'New Car Site',
    urls: [
      'https://newsite.com/cars/toyota',
      'https://newsite.com/cars/honda'
    ],
    frequency: 'daily',
    enabled: true
  }
];
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Deploy multiple Vercel instances
- Use database connection pooling
- Implement job queue distribution

### Vertical Scaling
- Increase Vercel function memory
- Optimize batch sizes
- Use streaming for large responses

### Cost Optimization
- Monitor Vertex AI usage
- Set appropriate quality thresholds
- Archive old data regularly

## 🎯 Next Steps

1. **Monitor Performance**: Set up alerts for job failures and quality drops
2. **Expand Sources**: Add more vehicle listing websites
3. **Improve Quality**: Fine-tune AI prompts and validation rules
4. **Add Features**: Implement duplicate detection, price tracking, alerts
5. **Optimize Costs**: Monitor and optimize Vertex AI usage

## 📞 Support

For issues or questions:
- Check logs in Vercel dashboard
- Monitor database in Neon console
- Review agent metrics in `/agents` dashboard
- Check job status in `agent_jobs` table