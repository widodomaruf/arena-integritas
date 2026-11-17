import { createClient } from '@supabase/supabase-js'

// Kunci publishable aman dipasang di aplikasi: semua akses dijaga RLS & fungsi di database.
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://udnfdxmlvhitcojuuqhd.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_9ACLdSya1hxZepXCWjyxeg_KmA8JuHG'

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
})

export const GAMES = {
  kuis_live: { nama: 'Kuis Live', ket: 'Pilihan ganda & benar/salah' },
  terima_tolak: { nama: 'Terima atau Tolak?', ket: 'Kartu skenario pemberian' },
  tebak_delik: { nama: 'Tebak Delik', ket: '7 kelompok tindak pidana korupsi' },
  detektif_spj: { nama: 'Detektif SPJ', ket: 'Temukan kejanggalan di dokumen' },
  susun_alur: { nama: 'Susun Alur', ket: 'Urutkan langkah melapor & menolak' },
  dilema: { nama: 'Dilema Bercabang', ket: 'Cerita bercabang, suara terbanyak menentukan akhir' },
}

// Nama untuk sesi paket (beberapa game dalam satu PIN). Tidak tampil sebagai kartu game.
export const NAMA_SESI = { ...Object.fromEntries(Object.entries(GAMES).map(([k, g]) => [k, g.nama])), campuran: 'Paket sesi' }

export const SASARAN = [
  { id: 'sd', nama: 'SD', ket: 'Kelas 4–6' },
  { id: 'smp', nama: 'SMP', ket: 'Siswa SMP/MTs' },
  { id: 'sma', nama: 'SMA/SMK', ket: 'Siswa SMA/SMK/MA' },
  { id: 'mahasiswa', nama: 'Mahasiswa', ket: 'Perguruan tinggi' },
  { id: 'asn', nama: 'ASN/Pegawai', ket: 'Instansi & BUMN/BUMD' },
  { id: 'umum', nama: 'Masyarakat umum', ket: 'Warga, orang tua, pelaku usaha' },
]

export const TOPIK = {
  nilai_integritas: 'Nilai integritas',
  kejujuran_akademik: 'Kejujuran akademik',
  dampak_korupsi: 'Dampak korupsi',
  gratifikasi: 'Gratifikasi',
  pungli_layanan: 'Pungli & layanan publik',
  pengadaan_spj: 'Pengadaan & SPJ',
  benturan_kepentingan: 'Benturan kepentingan',
  delik_korupsi: 'Jenis tindak pidana korupsi',
  pelaporan: 'Cara melapor',
  keluarga: 'Peran keluarga',
  sejarah_kpk: 'Sejarah & peran KPK',
}

export const BANK_V2 = 'Bank Soal Arnitas v2'

export function pesanError(e) {
  const m = e?.message || String(e)
  if (/anonymous/i.test(m) && /disabled/i.test(m)) return 'Login anonim belum diaktifkan di Supabase. Minta fasilitator mengaktifkannya.'
  if (/rate limit/i.test(m)) return 'Terlalu banyak percobaan pendaftaran atau masuk. Tunggu sekitar 1 jam, lalu coba lagi.'
  if (/already registered|already exists/i.test(m)) return 'Email ini sudah terdaftar. Pilih "Sudah punya akun? Masuk".'
  if (/password should be at least/i.test(m)) return 'Kata sandi minimal 8 karakter.'
  if (/invalid email|unable to validate email/i.test(m)) return 'Format email tidak valid.'
  if (/failed to fetch|network/i.test(m)) return 'Koneksi internet bermasalah. Periksa jaringan, lalu coba lagi.'
  return m
}

export async function pastikanLoginAnonim() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: d, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return d.session
}
