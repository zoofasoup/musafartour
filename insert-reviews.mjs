import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gmcbpcazyeaulwlmgmot.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtY2JwY2F6eWVhdWx3bG1nbW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NzQ5NDQsImV4cCI6MjA3NzA1MDk0NH0.e9Cew8ZGIE0Bb2QBm6NB0NlG3AFVW18KT8mAurYmyeo';
const supabase = createClient(supabaseUrl, supabaseKey);

const reviews = [
  {
    name: "Budi Santoso",
    content: "Alhamdulillah perjalanan umroh bersama Musafar Tour sangat berkesan. Pelayanannya luar biasa dari awal pendaftaran sampai kembali ke tanah air. Hotelnya benar-benar dekat dengan Masjidil Haram (Zamzam Tower), makanan khas Indonesia cocok untuk orang tua saya, dan muthawif sangat sabar membimbing. Sangat direkomendasikan untuk umroh keluarga!",
    rating: 5,
    location: "Bekasi",
    gender: "male"
  },
  {
    name: "Siti Aminah",
    content: "Travel yang sangat amanah. Saya berangkat bawa anak kecil dan orang tua yang butuh kursi roda. Tim Musafar sangat responsif membantu dari bandara sampai di Mekkah. Fasilitas pas di kantong tapi layanannya rasa VIP. InsyaAllah kalau ada rezeki umroh lagi pasti pakai Musafar Tour.",
    rating: 5,
    location: "Jakarta",
    gender: "female"
  },
  {
    name: "Ahmad Fauzi",
    content: "Harga transparan dan tidak ada biaya tersembunyi. Hotel di Madinah dekat pintu gate, hotel di Mekkah juga tinggal turun lift. Muthawif ustadznya sangat berilmu dan kajiannya mendalam. Kajian sejarah di Madinah sangat berkesan. Terima kasih Musafar Tour!",
    rating: 5,
    location: "Depok",
    gender: "male"
  },
  {
    name: "Rina Kusuma",
    content: "Berangkat umroh sendirian awalnya ragu, tapi ternyata jamaahnya sangat kekeluargaan. Tour leader dari Jakarta sangat care memastikan semua jamaah kumpul dan tidak nyasar. Makanannya enak banget berasa masakan rumah. Sukses terus Musafar Tour PT Musa Amanah Wisata!",
    rating: 5,
    location: "Tangerang",
    gender: "female"
  },
  {
    name: "Hendra Wijaya",
    content: "Sangat profesional. Pengurusan visa dan paspor cepat dibantu. Pas di sana ada jamaah yang sakit langsung ditangani dengan sigap oleh dokter pendamping. Benar-benar travel yang memprioritaskan ibadah dan keselamatan jamaah. Recommended 100%.",
    rating: 5,
    location: "Bogor",
    gender: "male"
  }
];

async function insertReviews() {
  console.log("Attempting to insert reviews...");
  const { data, error } = await supabase
    .from('testimonials')
    .insert(reviews)
    .select();

  if (error) {
    console.error("Error inserting reviews:", error);
    if (error.code === '42501') {
      console.log("RLS violation: The database requires authentication or RLS policies prevent anon inserts.");
    }
  } else {
    console.log("Successfully inserted reviews:", data.length);
  }
}

insertReviews();
