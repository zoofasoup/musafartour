import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SPREADSHEET_ID = '11R3Dv7YNJEYj0NLCY-xm4OH2PuZ_T85jsbizPJNQsn0'
const SHEET_NAME = 'ALL PACKAGES_FIX'

// ---------- Column Aliases → DB Field ----------
// Maps various header names to database column names
const HEADER_MAP: Record<string, string> = {
  'no': '_row_number',
  'dev': '_dev',
  'codename': '_codename',
  'vendor': '_vendor',
  'berangkat': 'departure_date',
  'tanggal berangkat': 'departure_date',
  'tanggal keberangkatan': 'departure_date',
  'departure': 'departure_date',
  'durasi': 'duration_days',
  'duration': 'duration_days',
  'klasifikasi paket': '_tier',
  'klasifikasi': '_tier',
  'tier': '_tier',
  'seat': '_seat',
  'judul paket': 'package_name',
  'nama paket': 'package_name',
  'package name': 'package_name',
  'timeframe': 'timeframe',
  'start': 'start_airport',
  'bandara': 'start_airport',
  'maskapai': 'flight',
  'airline': 'flight',
  'penerbangan': 'flight',
  'direct/transit': 'flight_type',
  'tipe penerbangan': 'flight_type',
  'rute': 'route',
  'route': 'route',
  'itinerary': '_itinerary_desc',
  'hotel makkah': 'makkah_hotel_name',
  'hotel mekkah': 'makkah_hotel_name',
  'makkah': 'makkah_hotel_name',
  'hotel madinah': 'madinah_hotel_name',
  'madinah': 'madinah_hotel_name',
  'bintang makkah': 'makkah_hotel_star',
  'star makkah': 'makkah_hotel_star',
  'bintang madinah': 'madinah_hotel_star',
  'star madinah': 'madinah_hotel_star',
  'malam makkah': 'nights_makkah',
  'nights makkah': 'nights_makkah',
  'malam madinah': 'nights_madinah',
  'nights madinah': 'nights_madinah',
  'malam kota': 'nights_extra',
  'malam kota +': 'nights_extra',
  'nights extra': 'nights_extra',
  'harga quad': '_price_quad',
  'quad': '_price_quad',
  'harga triple': '_price_triple',
  'triple': '_price_triple',
  'harga double': '_price_double',
  'double': '_price_double',
  'harga jual quad': '_price_quad',
  'harga jual triple': '_price_triple',
  'harga jual double': '_price_double',
  'diskon': 'max_discount',
  'max diskon': 'max_discount',
  'maksimal diskon': 'max_discount',
  'selling point': 'selling_points',
  'selling points': 'selling_points',
  'highlight': 'selling_points',
  'transport': '_transport',
  'transportasi': '_transport',
}

// ---------- Helpers ----------

const KNOWN_AIRLINES: Record<string, string> = {
  'oman': 'Oman Air', 'oman air': 'Oman Air',
  'qatar': 'Qatar Airways', 'qatar airways': 'Qatar Airways',
  'garuda': 'Garuda Indonesia', 'garuda indonesia': 'Garuda Indonesia',
  'lion': 'Lion Air', 'lion air': 'Lion Air',
  'saudia': 'Saudia', 'saudi': 'Saudia', 'saudi arabian': 'Saudia',
  'emirates': 'Emirates', 'scoot': 'Scoot',
}

function fuzzyAirline(input: string): string {
  if (!input) return ''
  const n = input.trim().toLowerCase()
  for (const [k, v] of Object.entries(KNOWN_AIRLINES)) {
    if (n.includes(k) || k.includes(n)) return v
  }
  return input.trim()
}

function slugify(t: string): string {
  return t.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function parseRupiah(v: string | number): number {
  if (typeof v === 'number') return v
  if (!v) return 0
  return parseInt(String(v).replace(/[^\d]/g, '')) || 0
}

function parseDate(v: string): string | null {
  if (!v) return null
  const s = v.trim()
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  }
  // "June 21, 2026" or "Jun 21, 2026"
  let m = s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/)
  if (m) {
    const mo = months[m[1].toLowerCase()] || months[m[1].toLowerCase().substring(0, 3)]
    if (mo) return `${m[3]}-${mo}-${m[2].padStart(2, '0')}`
  }
  // "21 Jun 2026"
  m = s.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (m) {
    const mo = months[m[2].toLowerCase()] || months[m[2].toLowerCase().substring(0, 3)]
    if (mo) return `${m[3]}-${mo}-${m[1].padStart(2, '0')}`
  }
  // DD/MM/YYYY
  m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  return null
}

// ---------- Header matching ----------

function matchHeader(header: string): string | null {
  const normalized = header.trim().toLowerCase()
  if (!normalized) return null

  // Exact match
  if (HEADER_MAP[normalized]) return HEADER_MAP[normalized]

  // Fuzzy: check if any alias is contained in header or vice versa
  for (const [alias, field] of Object.entries(HEADER_MAP)) {
    if (normalized.includes(alias) || alias.includes(normalized)) return field
  }
  return null
}

// ---------- Main ----------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY')
    if (!apiKey) throw new Error('GOOGLE_SHEETS_API_KEY not configured')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch sheet data
    const range = encodeURIComponent(`${SHEET_NAME}!A1:AD100`)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${apiKey}&valueRenderOption=FORMATTED_VALUE`

    console.log('📊 Fetching Google Sheet...')
    const resp = await fetch(url)
    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Sheets API ${resp.status}: ${errText}`)
    }

    const data = await resp.json()
    const rows: string[][] = data.values || []
    console.log(`📊 Got ${rows.length} rows`)

    if (rows.length < 2) {
      return new Response(JSON.stringify({ message: 'Sheet terlalu sedikit data' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Find header row ---
    // Header row is the first row that has recognizable column names
    let headerRowIdx = -1
    let columnMap: Record<string, number> = {} // field -> column index

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r] || []
      const matches: Record<string, number> = {}
      let matchCount = 0

      for (let c = 0; c < row.length; c++) {
        const field = matchHeader(row[c])
        if (field && !matches[field]) {
          matches[field] = c
          matchCount++
        }
      }

      if (matchCount >= 3) { // At least 3 recognized headers
        headerRowIdx = r
        columnMap = matches
        break
      }
    }

    if (headerRowIdx === -1) {
      return new Response(JSON.stringify({ message: 'Header row tidak ditemukan', rows: rows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Log mapping
    const headerRow = rows[headerRowIdx] || []
    console.log(`📋 Header row: ${headerRowIdx}`)
    console.log(`📋 All headers: ${headerRow.join(' | ')}`)
    console.log(`📋 Mapped: ${JSON.stringify(columnMap)}`)

    // --- Parse data rows ---
    const getVal = (row: string[], field: string): string => {
      const col = columnMap[field]
      if (col === undefined) return ''
      return (row[col] ?? '').trim()
    }

    const results = { synced: 0, skipped: 0, errors: 0, details: [] as string[] }
    const dataRows = rows.slice(headerRowIdx + 1)

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row || row.every(c => !c?.trim())) {
        results.skipped++
        continue
      }

      const packageName = getVal(row, 'package_name')
      if (!packageName) {
        results.skipped++
        results.details.push(`Row ${i + headerRowIdx + 2}: Nama paket kosong, skip`)
        continue
      }

      const departureDateRaw = getVal(row, 'departure_date')
      const departureDate = parseDate(departureDateRaw)
      if (!departureDate) {
        results.skipped++
        results.details.push(`Row ${i + headerRowIdx + 2}: Tanggal "${departureDateRaw}" invalid, skip "${packageName}"`)
        continue
      }

      // Dev/published status
      const devVal = getVal(row, '_dev').toLowerCase()
      const isPublished = devVal === 'true' || devVal === '1' || devVal === 'ya' || devVal === 'yes'

      // Tier
      const tier = getVal(row, '_tier') || 'Nyaman'

      // Duration
      const duration = parseInt(getVal(row, 'duration_days')) || 9

      // Airline
      const airlineRaw = getVal(row, 'flight')
      const airline = fuzzyAirline(airlineRaw)

      // Flight type
      const flightTypeRaw = getVal(row, 'flight_type').toLowerCase()
      const flightType = flightTypeRaw.includes('direct') ? 'direct' : flightTypeRaw.includes('transit') ? 'transit' : 'direct'

      // Hotels
      const makkahHotel = getVal(row, 'makkah_hotel_name') || null
      const madinahHotel = getVal(row, 'madinah_hotel_name') || null
      const makkahStar = parseInt(getVal(row, 'makkah_hotel_star')) || null
      const madinahStar = parseInt(getVal(row, 'madinah_hotel_star')) || null
      const nightsMakkah = parseInt(getVal(row, 'nights_makkah')) || null
      const nightsMadinah = parseInt(getVal(row, 'nights_madinah')) || null
      const nightsExtra = parseInt(getVal(row, 'nights_extra')) || null

      // Prices
      const priceQuad = parseRupiah(getVal(row, '_price_quad'))
      const priceTriple = parseRupiah(getVal(row, '_price_triple'))
      const priceDouble = parseRupiah(getVal(row, '_price_double'))

      // Other fields
      const route = getVal(row, 'route') || null
      const timeframe = getVal(row, 'timeframe') || null
      const startAirport = getVal(row, 'start_airport') || null
      const maxDiscount = parseInt(getVal(row, 'max_discount')) || null
      const sellingPoints = getVal(row, 'selling_points') || null
      const codename = getVal(row, '_codename')

      // Generate slug from codename or package name
      const slug = slugify(codename || packageName)

      // Determine transport based on tier
      const transport = getVal(row, '_transport') || (
        tier.toLowerCase().includes('five') || tier.toLowerCase().includes('bintang 5')
          ? 'Kereta Cepat' : 'Bus Eksklusif'
      )

      // Build tier-specific price
      const basePrice = { quad: priceQuad, triple: priceTriple, double: priceDouble }
      const tierLower = tier.toLowerCase()

      const upsertData: Record<string, unknown> = {
        package_name: packageName,
        departure_date: departureDate,
        duration_days: duration,
        flight: airline,
        flight_type: flightType,
        makkah_hotel_name: makkahHotel,
        madinah_hotel_name: madinahHotel,
        makkah_hotel_star: makkahStar,
        madinah_hotel_star: madinahStar,
        nights_makkah: nightsMakkah,
        nights_madinah: nightsMadinah,
        nights_extra: nightsExtra,
        route: route,
        timeframe: timeframe,
        start_airport: startAirport,
        max_discount: maxDiscount,
        selling_points: sellingPoints,
        slug: slug,
        status: isPublished ? 'published' : 'draft',
        updated_at: new Date().toISOString(),
      }

      // Map price to the correct tier column
      if (tierLower.includes('hemat')) {
        upsertData.hemat_package_price = basePrice
        upsertData.hemat_transport = transport
        upsertData.available_tiers = ['hemat']
        upsertData.package_price = basePrice // Also set default
      } else if (tierLower.includes('five') || tierLower.includes('bintang 5') || tierLower.includes('bintang5')) {
        upsertData.five_star_package_price = basePrice
        upsertData.five_star_transport = transport
        upsertData.available_tiers = ['five_star']
        upsertData.package_price = basePrice
      } else if (tierLower.includes('pelataran')) {
        upsertData.pelataran_package_price = basePrice
        upsertData.pelataran_transport = transport
        upsertData.available_tiers = ['pelataran']
        upsertData.package_price = basePrice
      } else {
        // Default: Nyaman / best_seller
        upsertData.package_price = basePrice
        upsertData.best_seller_transport = transport
        upsertData.available_tiers = ['best_seller']
      }

      // Upsert: try by slug first
      const { data: existing } = await supabase
        .from('packages')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      let error
      if (existing) {
        const res = await supabase.from('packages').update(upsertData).eq('id', existing.id)
        error = res.error
      } else {
        const res = await supabase.from('packages').insert(upsertData)
        error = res.error
      }

      if (error) {
        results.errors++
        results.details.push(`❌ "${packageName}": ${error.message}`)
      } else {
        results.synced++
        results.details.push(`✅ "${packageName}" (${existing ? 'updated' : 'created'})`)
      }
    }

    // --- Sync selling_points → package_items (optional includes) ---
    // Collect all unique selling points across all packages
    const allSellingPoints = new Set<string>()
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row) continue
      const sp = getVal(row, 'selling_points')
      if (sp) {
        sp.split(',').map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => allSellingPoints.add(s))
      }
    }

    // Fetch existing optional package_items
    const { data: existingItems } = await supabase
      .from('package_items')
      .select('name')
      .eq('type', 'include')
      .eq('is_essential', false)

    const existingNames = new Set((existingItems || []).map((i: any) => i.name))

    // Insert new ones
    const newItems = [...allSellingPoints].filter(name => !existingNames.has(name))
    if (newItems.length > 0) {
      const { error: itemsError } = await supabase
        .from('package_items')
        .insert(newItems.map((name, idx) => ({
          name,
          type: 'include',
          is_essential: false,
          is_active: true,
          display_order: 100 + idx,
        })))
      if (itemsError) {
        console.error('Error syncing selling points to package_items:', itemsError)
      } else {
        console.log(`📦 Synced ${newItems.length} new selling points to package_items`)
      }
    }

    const summary = {
      message: `Sync selesai: ${results.synced} berhasil, ${results.skipped} dilewati, ${results.errors} gagal`,
      ...results,
      selling_points_synced: newItems.length,
    }
    console.log(`📊 ${summary.message}`)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Sync error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
