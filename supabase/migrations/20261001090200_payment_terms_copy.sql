-- Payment terms shown to jamaah follow the offline rules set on 2026-10-01:
-- DP Rp 5 jt per pax, cicilan any time/any amount, lunas H-30, PT accounts only.
-- (The homepage FAQ still said "DP mulai Rp 3 jt, lunas 1 bulan sebelum".)
UPDATE public.faq_items
   SET answer = 'Sangat mudah! Anda cukup membayar Uang Muka (DP) sebesar Rp 5.000.000/pax untuk booking seat (DP non-refundable). Cicilan bebas, kapan saja dan berapa saja, asalkan lunas paling lambat H-30 sebelum tanggal keberangkatan. Demi keamanan, SEMUA transaksi hanya ditransfer ke Rekening Resmi Perusahaan (PT Musa Amanah Wisata): BCA 1643337111, BSI 7213170788, atau BNI 1784469461.'
 WHERE id = '31d03571-6fc2-43fa-9eae-5968848639f4';
