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

export function pesanError(e) {
  const m = e?.message || String(e)
  if (/anonymous/i.test(m) && /disabled/i.test(m)) return 'Login anonim belum diaktifkan di Supabase. Minta fasilitator mengaktifkannya.'
  return m
}

export async function pastikanLoginAnonim() {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session
  const { data: d, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return d.session
}
