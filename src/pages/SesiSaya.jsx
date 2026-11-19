import { useEffect, useState } from 'react'
import { supabase, NAMA_SESI, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'

const STATUS = { lobby: 'Menunggu peserta', running: 'Sedang berjalan', reveal: 'Sedang berjalan' }
const tanggal = (t) => (t ? new Date(t).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '')

function Baris({ s, selesai, konfirmasi, setKonfirmasi, hapus, sibuk }) {
  const judul = s.judul || NAMA_SESI[s.game] || s.game
  const buka = () => pindah(selesai ? `/host/riwayat/${s.id}` : `/host/${s.id}`)
  const mau = konfirmasi === s.id
  return (
    <li className="baris-sesi">
      <a href={selesai ? `/host/riwayat/${s.id}` : `/host/${s.id}`} onClick={(e) => { e.preventDefault(); buka() }} className="info-sesi">
        <span style={{ fontWeight: 800 }}>{judul}</span>
        <span className="muted" style={{ fontSize: 15 }}>PIN {s.pin} · {tanggal(selesai ? s.ended_at || s.created_at : s.created_at)}{!selesai && ` · ${STATUS[s.status] || s.status}`}</span>
      </a>
      {mau ? (
        <span className="konfirmasi-hapus" role="group" aria-label={`Konfirmasi hapus sesi PIN ${s.pin}`}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{selesai ? 'Hapus riwayat ini?' : 'Hapus sesi ini?'} Data peserta ikut terhapus.</span>
          <button type="button" className="btn kecil" style={{ background: 'var(--salah)', color: '#fff' }} disabled={sibuk} onClick={() => hapus(s.id)}>Ya, hapus</button>
          <button type="button" className="btn sekunder kecil" onClick={() => setKonfirmasi('')}>Batal</button>
        </span>
      ) : (
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn sekunder kecil" onClick={buka}>{selesai ? 'Lihat laporan' : 'Lanjutkan'}</button>
          <button type="button" className="btn sekunder kecil" onClick={() => setKonfirmasi(s.id)} aria-label={`Hapus sesi PIN ${s.pin}`}>Hapus</button>
        </span>
      )}
    </li>
  )
}

export default function SesiSaya({ user }) {
  const [daftar, setDaftar] = useState(null)
  const [konfirmasi, setKonfirmasi] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [err, setErr] = useState('')

  async function muat() {
    const { data, error } = await supabase.from('sessions').select('id, pin, game, judul, status, created_at, ended_at')
      .eq('host_id', user.id).order('created_at', { ascending: false }).limit(60)
    if (error) setErr(pesanError(error))
    setDaftar(data || [])
  }
  useEffect(() => { muat() }, [user.id])

  async function hapus(id) {
    setSibuk(true); setErr('')
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    setSibuk(false)
    if (error) { setErr(pesanError(error)); return }
    setKonfirmasi('')
    setDaftar((d) => d.filter((s) => s.id !== id))
    try { localStorage.removeItem(`ai_sesi_${id}`); localStorage.removeItem(`ai_paket_${id}`); localStorage.removeItem(`ai_dilema_${id}`) } catch {}
  }

  if (!daftar) return null
  const terbuka = daftar.filter((s) => s.status !== 'ended')
  const selesai = daftar.filter((s) => s.status === 'ended')
  const umum = { konfirmasi, setKonfirmasi, hapus, sibuk }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1040, width: '100%', margin: '0 auto' }}>
      {err && <p className="error" role="alert">{err}</p>}
      {terbuka.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="label">Sesi yang belum selesai</h2>
          <ul className="daftar-sesi">{terbuka.map((s) => <Baris key={s.id} s={s} {...umum} />)}</ul>
        </section>
      )}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="label">Riwayat sesi</h2>
        {selesai.length ? <ul className="daftar-sesi">{selesai.map((s) => <Baris key={s.id} s={s} selesai {...umum} />)}</ul>
          : <p className="muted">Belum ada sesi yang selesai. Laporan dan tombol cetak PDF muncul di sini setelah sesi diakhiri.</p>}
      </section>
    </div>
  )
}
