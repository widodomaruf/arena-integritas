import { useEffect, useRef, useState } from 'react'
import { useMasuk } from '../lib/animasi.jsx'
import { supabase, GAMES, NAMA_SESI, durasiEfektif, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'
import { ambilProfil } from './Profil.jsx'

const angka = (n) => (n ?? 0).toLocaleString('id-ID')
const tgl = (t) => new Date(t).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Supabase membatasi 1000 baris per permintaan, jadi jawaban diambil per halaman.
async function ambilSemuaJawaban(sid) {
  const semua = []
  for (let dari = 0; ; dari += 1000) {
    const { data, error } = await supabase.from('answers').select('question_id, benar').eq('session_id', sid).range(dari, dari + 999)
    if (error) throw error
    semua.push(...data)
    if (data.length < 1000) break
  }
  return semua
}

export default function LaporanSesi({ sid }) {
  const [lap, setLap] = useState(null)
  const [err, setErr] = useState('')

  const akar = useRef(null)
  useMasuk(akar, [!!lap])
  useEffect(() => {
    ;(async () => {
      try {
        const { data: u } = await supabase.auth.getUser()
        if (!u.user || u.user.is_anonymous) return pindah('/host')
        const { data: s, error } = await supabase.from('sessions').select('*').eq('id', sid).maybeSingle()
        if (error || !s || s.host_id !== u.user.id) { setErr('Sesi tidak ditemukan atau bukan milik akun ini.'); return }
        const [{ data: pemain }, jawaban, profil] = await Promise.all([
          supabase.from('players').select('id, nama, skor').eq('session_id', sid).order('skor', { ascending: false }),
          ambilSemuaJawaban(sid),
          ambilProfil(u.user.id).catch(() => null),
        ])
        const dijawab = [...new Set(jawaban.map((a) => a.question_id))]
        const urut = (s.soal_ids || dijawab).filter((id) => dijawab.includes(id))
        const { data: qs } = urut.length ? await supabase.from('questions').select('id, game, prompt, payload, durasi_detik').in('id', urut) : { data: [] }
        const peta = new Map((qs || []).map((q) => [q.id, q]))
        const soal = urut.map((id) => peta.get(id)).filter(Boolean).map((q) => {
          const j = jawaban.filter((a) => a.question_id === q.id)
          const benar = j.filter((a) => a.benar === true).length
          return { q, jumlah: j.length, benar, persen: q.game === 'dilema' ? null : j.length ? Math.round((benar / j.length) * 100) : 0 }
        })
        setLap({ s, pemain: pemain || [], soal, profil })
      } catch (e) { setErr(pesanError(e)) }
    })()
  }, [sid])

  if (err) return <div className="host"><p className="error">{err}</p><button className="btn kecil" onClick={() => pindah('/host')}>Kembali</button></div>
  if (!lap) return <div className="host"><p className="muted">Memuat laporan…</p></div>

  const { s, pemain, soal, profil } = lap
  const nilai = soal.filter((x) => x.persen !== null)
  const rata = nilai.length ? Math.round(nilai.reduce((a, x) => a + x.persen, 0) / nilai.length) : null
  const lama = s.ended_at ? Math.max(1, Math.round((new Date(s.ended_at) - new Date(s.created_at)) / 60000)) : null
  const judul = s.judul || NAMA_SESI[s.game] || s.game
  const fasilitator = [profil?.nama, profil?.skema_paksi && `Penyuluh Antikorupsi ${profil.skema_paksi}`, profil?.no_reg_paksi && `No. ${profil.no_reg_paksi}`, profil?.instansi].filter(Boolean).join(' · ')

  return (
    <div className="host halaman-laporan" ref={akar}>
      <div data-masuk className="no-print" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn sekunder kecil" onClick={() => pindah('/host')}>← Ruang fasilitator</button>
        <button className="btn tekan" onClick={() => window.print()}>Cetak PDF</button>
      </div>
      <p className="muted no-print" style={{ fontSize: 15, marginTop: -8 }}>Di kotak cetak, pilih "Simpan sebagai PDF" sebagai printer.</p>

      <article className="laporan">
        <header data-masuk className="laporan-kop">
          <span className="laporan-label">Laporan sesi Arnitas · Arena Integritas</span>
          <h1>{judul}</h1>
          <p>{tgl(s.ended_at || s.created_at)} · PIN {s.pin}</p>
          {fasilitator && <p>Fasilitator: {fasilitator}</p>}
        </header>

        <section data-masuk className="laporan-ringkas" aria-label="Ringkasan">
          <div><b>{pemain.length}</b><span>peserta</span></div>
          <div><b>{soal.length}</b><span>{s.game === 'dilema' ? 'babak' : 'soal'}</span></div>
          <div><b>{rata === null ? '–' : `${rata}%`}</b><span>rata-rata benar</span></div>
          <div><b>{lama ? `${lama} mnt` : '–'}</b><span>lama sesi</span></div>
        </section>

        <section>
          <h2>Papan skor</h2>
          {pemain.length ? (
            <table>
              <thead><tr><th scope="col" style={{ width: 48 }}>#</th><th scope="col">Nama</th><th scope="col" style={{ width: 110, textAlign: 'right' }}>Skor</th></tr></thead>
              <tbody>{pemain.map((p, i) => <tr key={p.id}><td>{i + 1}</td><td>{p.nama}</td><td style={{ textAlign: 'right' }}>{angka(p.skor)}</td></tr>)}</tbody>
            </table>
          ) : <p>Tidak ada peserta.</p>}
        </section>

        <section>
          <h2>Hasil per soal</h2>
          {soal.length ? (
            <table>
              <thead><tr><th scope="col" style={{ width: 40 }}>No</th><th scope="col">Soal</th><th scope="col" className="kol-jenis" style={{ width: 104 }}>Jenis</th><th scope="col" style={{ width: 96, textAlign: 'right' }}>Benar</th></tr></thead>
              <tbody>{soal.map(({ q, jumlah, benar, persen }, i) => (
                <tr key={q.id}>
                  <td>{i + 1}</td>
                  <td>{q.prompt}<span className="laporan-kecil"><span className="hanya-hp"> · {GAMES[q.game]?.nama || q.game}</span> · {durasiEfektif(q, s)} dtk</span></td>
                  <td className="kol-jenis">{GAMES[q.game]?.nama || q.game}</td>
                  <td style={{ textAlign: 'right' }}>{persen === null ? 'Tanpa benar/salah' : `${persen}% (${benar}/${jumlah})`}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p>Belum ada soal yang dijawab.</p>}
        </section>

        <footer className="laporan-kaki">Dibuat dengan Arnitas (Arena Integritas) · arnitas.my.id</footer>
      </article>
    </div>
  )
}
