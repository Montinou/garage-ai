export const runtime = 'nodejs'

function unauthorized(message = 'Unauthorized') {
  return new Response(JSON.stringify({ error: message }), { status: 401, headers: { 'content-type': 'application/json' } })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const source = url.searchParams.get('source')
  if (!source) {
    return new Response(JSON.stringify({ error: 'Falta el parámetro ?source' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }

  // Protección opcional: token simple en Authorization: Bearer <CRON_SECRET>
  const requiredToken = process.env.CRON_SECRET
  if (requiredToken) {
    const auth = req.headers.get('authorization') || ''
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
    if (token !== requiredToken) return unauthorized()
  }

  try {
    const seedsParam = url.searchParams.getAll('seed') // permite múltiples seed URLs
    const result = await runScrape(source, { seedUrls: seedsParam })
    return new Response(JSON.stringify({ ok: true, source, ...result }), { status: 200, headers: { 'content-type': 'application/json' } })
  } catch (err: any) {
    console.error(`[cron:scrape] ${source}`, err)
    return new Response(JSON.stringify({ ok: false, source, error: String(err?.message || err) }), { status: 500, headers: { 'content-type': 'application/json' } })
  }
}

type RunOptions = {
  seedUrls?: string[]
}

async function runScrape(source: string, opts: RunOptions = {}) {
  const { VehicleScraperService, DefaultSources } = await import('@/lib/scraper-service')
  
  const startedAt = Date.now()
  
  // Get source configuration
  const sourceConfig = DefaultSources[source]
  if (!sourceConfig) {
    throw new Error(`Source configuration not found for: ${source}`)
  }

  // Initialize scraper service
  const scraperService = new VehicleScraperService()
  
  // Run scraping with optional seed URL override
  const result = await scraperService.scrapeSource(sourceConfig, opts)
  
  const finishedAt = Date.now()
  return { 
    durationMs: finishedAt - startedAt, 
    stats: result.stats,
    source: sourceConfig.id 
  }
}