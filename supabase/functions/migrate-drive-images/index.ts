import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find all packages with Google Drive banner images
    const { data: packages, error: fetchErr } = await supabase
      .from('packages')
      .select('id, slug, banner_image, gallery_images')
      .or('banner_image.ilike.%googleusercontent%,banner_image.ilike.%drive.google%')

    if (fetchErr) throw new Error(`Failed to fetch packages: ${fetchErr.message}`)
    if (!packages || packages.length === 0) {
      return new Response(JSON.stringify({ message: 'No Google Drive images found to migrate', migrated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`🖼️ Found ${packages.length} packages with Drive images`)

    const results = { migrated: 0, failed: 0, details: [] as string[] }

    for (const pkg of packages) {
      try {
        const imageUrl = pkg.banner_image
        if (!imageUrl) continue

        // Download the image
        console.log(`⬇️ Downloading image for "${pkg.slug}"...`)
        const imgResp = await fetch(imageUrl, {
          headers: { 'Accept': 'image/*' },
          redirect: 'follow',
        })

        if (!imgResp.ok) {
          results.failed++
          results.details.push(`❌ "${pkg.slug}": HTTP ${imgResp.status} downloading image`)
          continue
        }

        const contentType = imgResp.headers.get('content-type') || 'image/jpeg'
        const imageData = await imgResp.arrayBuffer()
        
        if (imageData.byteLength < 1000) {
          results.failed++
          results.details.push(`❌ "${pkg.slug}": Image too small (${imageData.byteLength} bytes), likely an error page`)
          continue
        }

        // Upload to storage as the original format (WebP conversion would need canvas which isn't available in Deno)
        const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
        const fileName = `${pkg.slug}-banner.${ext}`

        console.log(`⬆️ Uploading ${fileName} (${(imageData.byteLength / 1024).toFixed(1)}KB)...`)

        const { error: uploadErr } = await supabase.storage
          .from('package-images')
          .upload(fileName, imageData, {
            contentType,
            upsert: true,
          })

        if (uploadErr) {
          results.failed++
          results.details.push(`❌ "${pkg.slug}": Upload failed - ${uploadErr.message}`)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('package-images')
          .getPublicUrl(fileName)

        const publicUrl = urlData.publicUrl

        // Update package record
        const { error: updateErr } = await supabase
          .from('packages')
          .update({ banner_image: publicUrl })
          .eq('id', pkg.id)

        if (updateErr) {
          results.failed++
          results.details.push(`❌ "${pkg.slug}": DB update failed - ${updateErr.message}`)
          continue
        }

        results.migrated++
        results.details.push(`✅ "${pkg.slug}": Migrated (${(imageData.byteLength / 1024).toFixed(1)}KB)`)
        console.log(`✅ Migrated "${pkg.slug}"`)
      } catch (err) {
        results.failed++
        results.details.push(`❌ "${pkg.slug}": ${(err as Error).message}`)
      }
    }

    const summary = {
      message: `Migration complete: ${results.migrated} migrated, ${results.failed} failed out of ${packages.length} total`,
      ...results,
    }
    console.log(`📊 ${summary.message}`)

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Migration error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
