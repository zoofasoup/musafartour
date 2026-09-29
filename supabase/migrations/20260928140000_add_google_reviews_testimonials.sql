-- Real Google reviews for Musafar Tour, manually curated (see conversation for why:
-- Places API needs billing not yet set up, and scraping Google directly isn't something
-- we do). Appended after the 5 existing testimonials (all display_order=0) using
-- display_order 10-17 to preserve the chronological order given, without disturbing
-- the existing rows' relative ordering.
INSERT INTO public.testimonials (name, rating, content, image_url, display_order, is_active) VALUES
  ('Hendy Ershi', 5, 'Alhamdulillah Musafar sangat membantu dan memberikan pengalaman beribadah dengan keluarga sangat berkesan
Terimakasih utk Tour Leader dan Mutowif yang sudah sangat sabar dan membimbing dengan baik

Semoga Musafar semakin maju dan menjadi travel terbaik
Jazakallah khoiron 🙏🙏🙏', '/reviews/review-hendy-ershi.webp', 10, true),

  ('Sukirman Akhmadi', 5, 'Umroh pertama bersama Musafar bulan 17 Juli 2026 adalah HADIAH ULANG TAHUN PERNIKAHAN ke 30 tahun untuk istri dan alhamdulillah sangat berkesan, semoga umroh berikutnya kembali bersama Musafar, sukses terus...', '/reviews/review-sukirman-akhmadi.webp', 11, true),

  ('Huwaida Eljawiy', 5, 'MasyaAllah,
Allah mudahkan saya untuk berangkat umrah pertama kalinya, di tanggal 29 Oktober 2024. Walhamdulillah nya lagi, Allah pertemukan saya dengan MUSAFAR.
Pelayanan yang MUSAFAR berikan sangat tidak bisa lagi untuk diragukan. Dari pemilihan jadwal yang tepat, petugas dan crew yang ramah, serta fasilitas yang benar benar membuat kami semakin nyaman dan fokus dalam beribadah. Hal kecil dan mungkin terlihat spele namun MUSAFAR sangat memperhatikannya. Team dan muthawwif nya Sangat santun dengan para jamaah, kami benar benar dibimbing dan selalu diberi arahan dengan hikmah. TEAM dan MUTHAWIF nya semua sangat perhatian kepada para jamaah, mereka sllu memastikan kondisi jamaah, supaya para jamaah tetap bisa beribadah dengan sehat dan bugar.
Dan semoga Allah mudahkan untuk saya dan kita semua bisa berangkat umrah lagi bersama MUSAFAR. Allahuyubaarik.', '/reviews/review-huwaida-eljawiy.webp', 12, true),

  ('Dewi Mentari', 5, 'Masya Allah pengalaman umroh yang sangat menyenangkan, tour leader yang sangat sabar dalam membimbing ibadah umroh, muthowif yang luar biasa saat kita berada di area Mekkah dan Madinah. Terimakasih banyak bisa menjadi bagian dari keluarga Musafar. Insya Allah di perjalanan umroh berikutnya bisa mendapatkan kesempatan lagi umroh bersama keluarga Musafar selanjutnya. Amin', '/reviews/review-dewi-mentari.webp', 13, true),

  ('Arif Nur Rokhman', 5, 'Alhamdulillah bisa berkesempatan umroh sekeluarga berlima (3 dewasa & 2 anak) bersama Musafar. Pelayanannya baik, dari manasik yang lebih private di kantor sampai pelaksanaanya yang hampir tidak ada cobaan yang berarti buat kami. Semoga Musafar tetap amanah dan bisa meningkatkan kualitas pelayanan di masa yang akan datang. Amiiinn 🤲', '/reviews/review-arif-nur-rokhman.webp', 14, true),

  ('Zul Fikar', 5, 'Pengurus, TL dan Muthawif nya keren, semua terfasilitasi dengan sangat baik.
Selama di Makkah dan Madinah, sudah seperti keluarga yg saling menjaga, kegiatan yang dijadwalkan pun berjalan dengan lancar, dan tenang.
Sesuai tagline-nya "BUKAN SAFAR BIASA" perjalanan ibadah dan kegiatan lainnya benar-benar luar biasa.
Terimakasih tim musafar, TL dan Muthawif, umroh pertama kami berjalan dengan lancar dan susah move on.
🙏', '/reviews/review-zul-fikar.webp', 15, true),

  ('Adinda Putri Indraswari', 5, 'Bismillah

Alhamdulillah
Pengalaman kami umroh pertama menggunakan Musafar tidak mengecewakan, service yang diberikan sesuai dengan yang dijanjikan, muthawwif & tour leader semua membimbing dengan sabar & baik, kami yg membawa anak-anak pun merasa lebih dimudahkan dalam beribadah, semoga next time kami bisa umroh lagi bersama Musafar Aamiiin', '/reviews/review-adinda-putri-indraswari.webp', 16, true),

  ('Dias Darmawan Putra', 5, 'Alhamdulillah musafar tour & travel membuka jalan kami sekeliarga untuk berangkat umroh, dan di pengalaman pertama kami dengan musafar sangat luar biasa, dari penjelesan tentang sejarah sampai pelayanan yang sangat memuaskan selama di tanah suci', '/reviews/review-dias-darmawan-putra.webp', 17, true);
