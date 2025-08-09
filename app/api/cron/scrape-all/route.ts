export const runtime = 'nodejs'

export async function GET(req: Request) {
  // Import default sources directly from scraper service
  const { DefaultSources } = await import('@/lib/scraper-service')
  const sources = Object.keys(DefaultSources)

  if (!sources.length) {
    return new Response(JSON.stringify({ error: 'No scraper sources configured' }), {
      status: 400, headers: { 'content-type': 'application/json' }
    })
  }

  const startedAt = Date.now()
  const results: any[] = []
  
  for (const source of sources) {
    try {
      const r = await runScrape(source)
      results.push({ source, ok: true, ...r })
    } catch (err: any) {
      console.error(`[cron:scrape-all] ${source}`, err)
      results.push({ source, ok: false, error: String(err?.message || err) })
    }
  }
  
  const finishedAt = Date.now()
  return new Response(JSON.stringify({ 
    ok: true, 
    durationMs: finishedAt - startedAt, 
    results,
    totalSources: sources.length
  }), {
    status: 200, headers: { 'content-type': 'application/json' }
  })
}

async function runScrape(source: string) {
  const res = await fetch(new URL(`/api/cron/scrape?source=${encodeURIComponent(source)}`, process.env.APP_BASE_URL || 'http://localhost:3000'), {
    headers: process.env.CRON_SECRET ? { authorization: `Bearer ${process.env.CRON_SECRET}` } : {}
  })
  if (!res.ok) throw new Error(`Scrape ${source} status ${res.status}`)
  return res.json()
}