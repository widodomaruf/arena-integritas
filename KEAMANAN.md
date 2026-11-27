# Catatan keamanan Arnitas

Sumber: audit 24 November 2026. Laporan lengkap ada di artifact Claude "Laporan Audit Keamanan Arnitas (Arena Integritas)".

## Sudah diperbaiki (24 Nov 2026)

| Kode | Perbaikan |
|---|---|
| T-1 | `submit_answer`: penilaian Detektif SPJ memakai elemen unik, pecahan maks 1 |
| R-4 | `submit_answer`: ukuran jawaban dibatasi 4 KB, tipe `pilihan` harus array |
| S-1 | Akun anonim tidak bisa menulis bank/soal/rahasia soal; klien tidak bisa membuat bank publik |
| R-3 | Hanya host yang boleh menghapus pemain |
| R-2 | Hak `anon` dicabut; `TRUNCATE`/`TRIGGER`/`REFERENCES` dicabut dari `authenticated` |
| S-3 | Header keamanan HTTP di `vercel.json` (CSP belum) |
| S-4 | Vite 6.4.6 (`npm audit`: 0 kerentanan) |

SQL-nya ada di `supabase/migrasi/2026-11-24-perbaikan-keamanan.sql`.

## Audit 25 Nov 2026 (ditangani di branch perbaikan-audit-2)

| Kode | Perbaikan |
|---|---|
| N-1 | Token tautan email dipindah ke fragmen (`#token_hash=…`) agar tidak masuk GTM, analytics, atau log. Template email perlu diperbarui di Supabase |
| S-2 | `join_session` membatasi 8 PIN salah per 10 menit per akun anonim; PIN dibuat dari `gen_random_uuid()`. SQL: `supabase/migrasi/2026-11-27-perbaikan-audit-2.sql` (belum diterapkan ke database) |
| N-2 | Klien hanya boleh UPDATE `durasi_detik`, `judul`, `soal_ids` di `sessions`; `get_reveal` memeriksa bank sesi |

## Belum diperbaiki

| Kode | Tingkat | Masalah | Yang perlu dilakukan |
|---|---|---|---|
| S-2 | Sedang | PIN 6 angka bisa ditebak, tidak ada batas percobaan gabung; PIN dibuat dengan `random()` | Aktifkan CAPTCHA (Cloudflare Turnstile) untuk anonymous sign-in di Supabase › Authentication › Attack Protection. Pertimbangkan tombol "kunci sesi" setelah permainan mulai dan PIN dari `gen_random_bytes` (pgcrypto) |
| S-5 | Sedang | Daftar fasilitator tanpa verifikasi email (bila "Confirm email" dimatikan); Leaked Password Protection nonaktif; data profil (skema, nomor PAKSI) tidak diverifikasi | Putuskan kebijakan verifikasi email atau pasang CAPTCHA saat daftar. Leaked Password Protection mungkin hanya di paket berbayar |
| R-1 | Rendah | Peserta bisa membaca semua soal satu bank sebelum ditayangkan (`can_read_bank`). Kunci jawaban tetap aman di `question_secrets` | Ambil soal lewat RPC yang hanya mengembalikan soal aktif |
| R-5 | Rendah | Google Tag Manager (`GTM-KR9V8VNN`) bisa menyuntik JavaScript ke halaman yang menyimpan token sesi di `localStorage` | Aktifkan verifikasi 2 langkah di akun GTM; pasang hanya tag tepercaya |
| CSP | Rendah | Belum ada `Content-Security-Policy` | Susun CSP yang mengizinkan Supabase, GTM, Vercel Analytics, Google Fonts; uji di branch preview dulu |
| Dep | Info | `@supabase/supabase-js` 2.75.0, `react` 18.3.1 belum terbaru (tanpa advisori) | Perbarui terjadwal dan uji |

## Belum tercakup audit

Pengaturan Supabase Auth (batas laju, daftar URL redirect, SMTP), pengaturan proyek Vercel (Deployment Protection), dan uji penetrasi langsung. Audit ini baca-saja.
