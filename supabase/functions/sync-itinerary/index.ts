import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Papa from 'https://esm.sh/papaparse@5.4.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ItineraryDayBlock {
  day: string
  cities: Set<string>
  date: string
  activities: { time: string; text: string }[]
}

function extractSpreadsheetId(url: string): string | null {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : null
}

// "2026-06-21" -> "21.06.26"
function isoToTabNameShortYear(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y.slice(2)}`
}

// "2026-06-21" -> "21.06.2026"
function isoToTabNameLongYear(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

async function fetchTabCSV(spreadsheetId: string, tabName: string): Promise<string | null> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const text = await res.text()
  // Google returns a small HTML error page (still 200) when the sheet/tab doesn't exist
  if (text.trim().startsWith('<')) return null
  return text
}

function parseItineraryCSV(csvText: string): string[] {
  const parsed = Papa.parse(csvText.trim(), { skipEmptyLines: false })
  const rows = parsed.data as string[][]
  const dataRows = rows.slice(1).filter((r) => r.some((c) => c && c.trim()))

  const days: ItineraryDayBlock[] = []
  let current: ItineraryDayBlock | null = null
  let lastCity = ''
  let lastDate = ''

  for (const row of dataRows) {
    const hari = (row[1] || '').trim()
    const kota = (row[2] || '').trim()
    const tanggal = (row[3] || '').trim()
    const jam = (row[4] || '').trim()
    const kegiatan = (row[5] || '').trim()

    if (kota) lastCity = kota
    if (tanggal) lastDate = tanggal

    if (hari !== '') {
      current = { day: hari, cities: new Set(), date: lastDate, activities: [] }
      days.push(current)
    }
    if (!current) continue

    if (lastCity) current.cities.add(lastCity)
    if (jam || kegiatan) current.activities.push({ time: jam, text: kegiatan })
  }

  return days.map((d) => {
    const cityLine = Array.from(d.cities).join(' → ')
    const header = `Hari ${d.day} • ${cityLine}\n${d.date}`
    const body = d.activities
      .map((a) => (a.time ? `${a.time} — ${a.text}` : a.text))
      .filter(Boolean)
      .join('\n')
    return `${header}\n\n${body}`
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'superadmin'])
      .maybeSingle()

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: Requires admin role' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: packages, error: pkgError } = await supabase
      .from('packages')
      .select('id, package_name, departure_date, itinerary_link')
      .not('itinerary_link', 'is', null)

    if (pkgError) throw pkgError

    const results = { synced: 0, skipped: 0, errors: 0, details: [] as string[] }
    const csvCache = new Map<string, string[] | null>()

    for (const pkg of packages || []) {
      const spreadsheetId = extractSpreadsheetId(pkg.itinerary_link as string)
      if (!spreadsheetId || !pkg.departure_date) {
        results.skipped++
        results.details.push(`"${pkg.package_name}": link atau tanggal keberangkatan tidak valid`)
        continue
      }

      const cacheKey = `${spreadsheetId}::${pkg.departure_date}`
      let days = csvCache.get(cacheKey)

      if (days === undefined) {
        const shortTab = isoToTabNameShortYear(pkg.departure_date as string)
        const longTab = isoToTabNameLongYear(pkg.departure_date as string)
        let csv = await fetchTabCSV(spreadsheetId, shortTab)
        if (!csv) csv = await fetchTabCSV(spreadsheetId, longTab)
        days = csv ? parseItineraryCSV(csv) : null
        csvCache.set(cacheKey, days)
      }

      if (!days || days.length === 0) {
        results.skipped++
        results.details.push(
          `"${pkg.package_name}" (${pkg.departure_date}): tab itinerary tidak ditemukan di sheet - cek nama tab (harus format DD.MM.YY)`
        )
        continue
      }

      const { error: updateError } = await supabase
        .from('packages')
        .update({ itinerary: JSON.stringify(days) })
        .eq('id', pkg.id)

      if (updateError) {
        results.errors++
        results.details.push(`"${pkg.package_name}": ${updateError.message}`)
      } else {
        results.synced++
      }
    }

    const summary = {
      message: `Sync itinerary selesai: ${results.synced} berhasil, ${results.skipped} dilewati, ${results.errors} gagal`,
      ...results,
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Sync itinerary error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
