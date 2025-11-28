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

interface RecordData {
  id: string;
  slug?: string;
  title?: string;
  package_name?: string;
  destination?: string;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Invalid token or user not found:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: adminRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !adminRole) {
      console.log(`User ${user.id} attempted admin action without admin role`);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Admin ${user.id} initiated image processing`);
    // === END AUTHENTICATION CHECK ===

    const { bucketName, tableName, imageColumn, contextType }: ProcessRequest = await req.json();

    console.log(`Processing ${tableName}.${imageColumn} in bucket ${bucketName}`);

    // Fetch all records with images
    const { data: records, error: fetchError } = await supabase
      .from(tableName)
      .select('id, slug, title, package_name, destination, ' + imageColumn)
      .not(imageColumn, 'is', null);

    if (fetchError) throw fetchError;

    const results: Array<{ id: string; old: unknown; new: unknown }> = [];
    const typedRecords = (records || []) as unknown as RecordData[];

    for (const record of typedRecords) {
      const imageUrl = record[imageColumn] as string | string[] | null;
      
      if (!imageUrl || typeof imageUrl !== 'string') continue;
      
      // Handle array of images (gallery)
      const imageUrls = Array.isArray(imageUrl) ? imageUrl : [imageUrl];
      const processedUrls: string[] = [];

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
          const { error: uploadError } = await supabase.storage
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

  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});