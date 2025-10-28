import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessRequest {
  bucketName: string;
  tableName: string;
  imageColumn: string;
  contextType: 'package' | 'article' | 'wisata';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { bucketName, tableName, imageColumn, contextType }: ProcessRequest = await req.json();

    console.log(`Processing ${tableName}.${imageColumn} in bucket ${bucketName}`);

    // Fetch all records with images
    const { data: records, error: fetchError } = await supabase
      .from(tableName)
      .select('id, slug, title, package_name, destination, ' + imageColumn)
      .not(imageColumn, 'is', null);

    if (fetchError) throw fetchError;

    const results = [];

    for (const record of records || []) {
      const imageUrl = record[imageColumn];
      
      if (!imageUrl || typeof imageUrl !== 'string') continue;
      
      // Handle array of images (gallery)
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      const processedUrls = [];

      for (let idx = 0; idx < imageUrls.length; idx++) {
        const url = imageUrls[idx];
        if (!url.includes(bucketName)) continue;

        try {
          // Extract old path from URL
          const urlParts = url.split('/object/public/' + bucketName + '/');
          if (urlParts.length < 2) continue;
          
          const oldPath = urlParts[1];

          // Download the image
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(oldPath);

          if (downloadError || !fileData) {
            console.error(`Failed to download ${oldPath}:`, downloadError);
            continue;
          }

          // Generate contextual filename
          const timestamp = Date.now();
          const slug = record.slug || record.package_name || record.title || record.destination || 'item';
          const slugified = slug
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50);

          let newFileName: string;
          if (contextType === 'package') {
            const type = imageColumn === 'gallery_images' ? 'gallery' : 'banner';
            newFileName = `paket-umroh-${slugified}-${type}-${idx + 1}-${timestamp}.webp`;
          } else if (contextType === 'article') {
            newFileName = `artikel-${slugified}-featured-${timestamp}.webp`;
          } else {
            newFileName = `wisata-halal-${slugified}-banner-${timestamp}.webp`;
          }

          // Process image with canvas (compress + convert to WebP)
          const arrayBuffer = await fileData.arrayBuffer();
          const blob = new Blob([arrayBuffer]);
          
          // For now, just re-upload with new name (WebP conversion happens client-side)
          // In production, you'd use a library like 'sharp' or similar
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(newFileName, blob, {
              contentType: 'image/webp',
              upsert: false
            });

          if (uploadError) {
            console.error(`Failed to upload ${newFileName}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(newFileName);

          processedUrls.push(publicUrl);

          // Delete old file
          await supabase.storage.from(bucketName).remove([oldPath]);

        } catch (err) {
          console.error('Error processing image:', err);
        }
      }

      // Update database record
      if (processedUrls.length > 0) {
        const updateValue = Array.isArray(imageUrl) ? processedUrls : processedUrls[0];
        
        const { error: updateError } = await supabase
          .from(tableName)
          .update({ [imageColumn]: updateValue })
          .eq('id', record.id);

        if (updateError) {
          console.error('Failed to update record:', updateError);
        } else {
          results.push({
            id: record.id,
            old: imageUrl,
            new: updateValue,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
