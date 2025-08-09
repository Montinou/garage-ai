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
  // Punto único para integrar tus adaptadores y normalización
  // Reemplaza esta función con tu pipeline real (adapters -> normalize -> upsert)
  const startedAt = Date.now()
  const stats = { pages: 0, found: 0, upserts: 0 }

  // Sugerencia: centraliza la obtención del adaptador por source
  // const { getAdapter } = await import('@/adapters') // si existe
  // const adapter = getAdapter(source)

  // Placeholder: lanza error si aún no está conectado al adaptador real
  // throw new Error('Adapter no implementado para ' + source)

  // Si ya tienes un script/servicio, invócalo aquí.
  // await myScrapePipeline({ source, seedUrls: opts.seedUrls })

  const finishedAt = Date.now()
  return { durationMs: finishedAt - startedAt, stats }
}