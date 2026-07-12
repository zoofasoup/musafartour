import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gmcbpcazyeaulwlmgmot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtY2JwY2F6eWVhdWx3bG1nbW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NzQ5NDQsImV4cCI6MjA3NzA1MDk0NH0.e9Cew8ZGIE0Bb2QBm6NB0NlG3AFVW18KT8mAurYmyeo';
const supabase = createClient(supabaseUrl, supabaseKey);

const images = [
  {
    title: "Jamaah Musafar 1",
    description: "Kegiatan jamaah selama di Tanah Suci",
    image_url: "/gallery/jamaah-1.jpg",
    category: "umroh",
    display_order: 1,
    is_active: true
  },
  {
    title: "Jamaah Musafar 2",
    description: "Kegiatan jamaah selama di Tanah Suci",
    image_url: "/gallery/jamaah-2.jpg",
    category: "umroh",
    display_order: 2,
    is_active: true
  },
  {
    title: "Jamaah Musafar 3",
    description: "Kegiatan jamaah selama di Tanah Suci",
    image_url: "/gallery/jamaah-3.jpg",
    category: "umroh",
    display_order: 3,
    is_active: true
  },
  {
    title: "Jamaah Musafar 4",
    description: "Kegiatan jamaah selama di Tanah Suci",
    image_url: "/gallery/jamaah-4.jpg",
    category: "umroh",
    display_order: 4,
    is_active: true
  }
];

async function insertGallery() {
  console.log("Attempting to insert gallery images...");
  const { data, error } = await supabase
    .from('gallery_images')
    .insert(images)
    .select();

  if (error) {
    console.error("Error inserting images:", error);
  } else {
    console.log("Successfully inserted images:", data.length);
  }
}

insertGallery();
