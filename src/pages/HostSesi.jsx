import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import * as m from 'motion/react-m'
import { AngkaNaik } from '../lib/animasi.jsx'
import { supabase, GAMES, NAMA_SESI, pesanError, durasiEfektif } from '../supabase.js'
import { pindah } from '../App.jsx'
import { daftarOpsi, TombolOpsi, Ikon, useSisaWaktu } from '../components/Opsi.jsx'
import { urutanBenar, tandaEfek } from '../components/MiniGames.jsx'
import { putar, henti, musikNyala, aturMusik, dengarkanMusik } from '../lib/musik.js'

const angka = (n) => (n ?? 0).toLocaleString('id-ID')
const pinSpasi = (p) => (p ? `${p.slice(0, 3)} ${p.slice(3)}` : '')
const INDEKS_AWAL = 50

function bacaLokal(k, awal) { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? awal } catch { return awal } }
function tulisLokal(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

export default function HostSesi({ sid }) {
  const [sesi, setSesi] = useState(null)
  const [soal, setSoal] = useState([])
  const [pemain, setPemain] = useState([])
  const [qr, setQr] = useState('')
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [tampilSkor, setTampilSkor] = useState(false)
  // Dilema Bercabang: riwayat pilihan mayoritas tiap babak
  const [alur, setAlur] = useState(() => bacaLokal(`ai_dilema_${sid}`, []))

  const urlGabung = `${window.location.origin}/?pin=${sesi?.pin ?? ''}`
  const indeks = INDEKS_AWAL + alur.reduce((s, a) => s + (a.efek || 0), 0)

  async function muatPemain() {
    const { data } = await supabase.from('players').select('id, nama, skor, streak').eq('session_id', sid).order('skor', { ascending: false })
    setPemain(data || [])
  }

  useEffect(() => {
    let ch
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user || u.user.is_anonymous) return pindah('/host')
      const { data: s, error } = await supabase.from('sessions').select('*').eq('id', sid).maybeSingle()
      if (error || !s || s.host_id !== u.user.id) { setErr('Sesi tidak ditemukan atau bukan milik akun ini.'); return }
      setSesi(s)
      const urut = s.soal_ids || bacaLokal(`ai_sesi_${sid}`, null)
      let kueri = supabase.from('questions').select('id, kode, game, prompt, payload, durasi_detik, refleksi, dasar_hukum').eq('bank_id', s.bank_id)
      kueri = urut ? kueri.in('id', urut) : kueri.eq('game', s.game)
      const { data: qs } = await kueri.order('urutan')
      const peta = new Map((qs || []).map((q) => [q.id, q]))
      setSoal(urut ? urut.map((id) => peta.get(id)).filter(Boolean) : qs || [])
      await muatPemain()
      ch = supabase.channel(`host-${sid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sid}` }, muatPemain)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sid}` }, (p) => setSesi(p.new))
        .subscribe()
    })()
    const cadangan = setInterval(muatPemain, 4000)
    return () => { clearInterval(cadangan); if (ch) supabase.removeChannel(ch) }
  }, [sid])

  useEffect(() => { if (sesi?.pin) QRCode.toDataURL(urlGabung, { margin: 1, width: 480, color: { dark: '#14284B', light: '#FFFFFF' } }).then(setQr) }, [sesi?.pin])

  const idx = soal.findIndex((q) => q.id === sesi?.current_question_id)
  const q = idx >= 0 ? soal[idx] : null
  const dilema = sesi?.game === 'dilema'

  // Musik latar: ceria di lobi, tegang saat soal tayang, sorak saat hasil dibuka.
  const [musik, setMusik] = useState(musikNyala)
  useEffect(() => dengarkanMusik(setMusik), [])
  const st = sesi?.status
  const modeMusik = !st ? null
    : st === 'lobby' ? 'lobi'
    : st === 'ended' ? (dilema ? 'diam' : 'juara')
    : st === 'running' ? 'soal'
    : st === 'reveal' ? (dilema ? 'diam' : tampilSkor ? 'skor' : 'benar')
    : 'diam'
  useEffect(() => { if (modeMusik && musik) putar(modeMusik) }, [modeMusik, q?.id, musik])
  useEffect(() => () => henti(), [])

  async function aksi(fn) {
    setErr(''); setSibuk(true)
    try { const { data, error } = await fn(); if (error) throw error; if (data) setSesi(Array.isArray(data) ? data[0] : data) }
    catch (e) { setErr(pesanError(e)) } finally { setSibuk(false) }
  }
  const tayangId = (id) => { setTampilSkor(false); return aksi(() => supabase.rpc('host_show_question', { p_session: sid, p_question: id })) }
  const tayang = (i) => tayangId(soal[i].id)
  const buka = () => aksi(() => supabase.rpc('host_set_status', { p_session: sid, p_status: 'reveal' }))
  const selesai = () => aksi(() => supabase.rpc('host_set_status', { p_session: sid, p_status: 'ended' }))

  function mulai() {
    if (dilema) {
      const awal = soal.find((x) => x.payload?.node === 'N1') || soal[0]
      setAlur([]); tulisLokal(`ai_dilema_${sid}`, [])
      return tayangId(awal.id)
    }
    return tayang(0)
  }

  // Dilema: lanjut ke babak berikutnya sesuai pilihan mayoritas
  function lanjutCerita(pilihan, efek) {
    const o = daftarOpsi(q).find((x) => x.key === pilihan)
    const baru = [...alur, { node: q.payload?.node, pilihan, label: o?.label, efek }]
    setAlur(baru); tulisLokal(`ai_dilema_${sid}`, baru)
    const tujuan = soal.find((x) => x.payload?.skenario_id === q.payload?.skenario_id && x.payload?.node === o?.next)
    if (tujuan) return tayangId(tujuan.id)
    return selesai()
  }

  if (err && !sesi) return <div className="host"><p className="error">{err}</p><button className="btn kecil" onClick={() => pindah('/host')}>Kembali</button></div>
  if (!sesi) return <div className="host"><p className="muted">Memuat…</p></div>

  const label = sesi.status === 'lobby' || !q
    ? NAMA_SESI[sesi.game]
    : dilema ? `${q.payload?.judul} · ${q.payload?.akhir ? 'Akhir cerita' : `Babak ${alur.length + 1}`}` : `Soal ${idx + 1} dari ${soal.length}`

  const kepala = (
    <header className="host-header">
      <div className="brand">
        <img src="/logo-mark-on-dark.svg" alt="" />
        <span className="label" style={{ fontSize: 16 }}>{label} · PIN {pinSpasi(sesi.pin)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {dilema && sesi.status !== 'lobby' && <span className="chip kuning" style={{ fontSize: 18 }}>Indeks Integritas {indeks}</span>}
        <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 18 }}>
          <Ikon nama="orang" size={22} /> {pemain.length} peserta
        </span>
        <button type="button" className="btn sekunder kecil" aria-pressed={musik} onClick={() => aturMusik(!musik)}>
          {musik ? 'Musik: nyala' : 'Musik: mati'}
        </button>
        <a href="/host" onClick={(e) => { e.preventDefault(); pindah('/host') }} className="btn sekunder kecil">← Ruang fasilitator</a>
      </div>
    </header>
  )

  const aksiAkhir = (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <button className="btn sekunder kecil" onClick={() => pindah('/host')}>Kembali ke ruang fasilitator</button>
      <button className="btn tekan" onClick={() => pindah(`/host/riwayat/${sid}`)}>Lihat laporan &amp; cetak PDF</button>
    </div>
  )

  let isi
  if (sesi.status === 'lobby') {
    isi = (
      <>
        <main style={{ flex: 1, display: 'flex', gap: 'clamp(20px, 4vw, 40px)', alignItems: 'center', flexWrap: 'wrap' }}>
          <section style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p className="muted" style={{ fontSize: 26, fontWeight: 700 }}>Buka di HP kamu</p>
            <p style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, color: 'var(--toska)', wordBreak: 'break-all' }}>{window.location.host}</p>
            <p className="muted" style={{ fontSize: 26, fontWeight: 700 }}>lalu masukkan PIN</p>
            <p className="pin-besar">{pinSpasi(sesi.pin)}</p>
          </section>
          <aside style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {qr && <img src={qr} alt={`Kode QR menuju ${urlGabung}`} width="240" height="240" style={{ borderRadius: 'var(--radius-lg)', background: '#fff', padding: 12 }} />}
            <span className="muted" style={{ fontWeight: 700 }}>atau pindai kode ini</span>
          </aside>
        </main>
        <footer className="kartu-besar" style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <img src="/bening-senang.svg" alt="" width="80" height="80" />
          <div style={{ flex: '1 1 300px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pemain.length === 0 && <span className="muted" style={{ fontWeight: 700 }}>Menunggu peserta bergabung…</span>}
            {pemain.map((p) => <span key={p.id} className="chip">{p.nama}</span>)}
          </div>
          <button className="btn tekan" disabled={sibuk || soal.length === 0 || pemain.length === 0} onClick={mulai}>Mulai</button>
        </footer>
      </>
    )
  } else if (q && dilema && q.payload?.akhir && sesi.status !== 'ended') {
    isi = <AkhirCerita q={q} alur={alur} indeks={indeks} aksi={<button className="btn tekan" disabled={sibuk} onClick={selesai}>Tutup cerita</button>} />
  } else if (sesi.status === 'running' && q) {
    isi = <SoalTayang key={q.id} q={q} durasi={durasiEfektif(q, sesi)} sid={sid} totalPemain={pemain.length} onHabis={buka} sibuk={sibuk} />
  } else if (sesi.status === 'reveal' && q && !tampilSkor) {
    isi = <Pembahasan key={q.id} q={q} sid={sid} sibuk={sibuk} onLanjut={() => setTampilSkor(true)} onLanjutCerita={lanjutCerita} />
  } else if (sesi.status === 'reveal' && q && tampilSkor) {
    const terakhir = idx >= soal.length - 1
    isi = <PapanSkor pemain={pemain} judul="Papan Skor" aksi={
      <button className="btn tekan" disabled={sibuk} onClick={() => (terakhir ? selesai() : tayang(idx + 1))}>{terakhir ? 'Lihat juara' : 'Soal berikutnya'}</button>
    } />
  } else if (dilema) {
    isi = <AkhirCerita q={q} alur={alur} indeks={indeks} aksi={aksiAkhir} />
  } else {
    isi = <PapanSkor pemain={pemain} judul="Juara Arnitas" akhir aksi={aksiAkhir} />
  }

  return (
    <div className="host">
      {kepala}
      {isi}
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  )
}

/** Isi soal di layar proyektor, per jenis game. */
function KontenSoal({ q }) {
  if (q.game === 'detektif_spj') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {q.payload?.konteks && <p className="muted" style={{ fontSize: 22, fontWeight: 700 }}>{q.payload.konteks}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 12 }}>
          {(q.payload?.elemen || []).map((e) => (
            <div key={e.no} className="kartu" style={{ display: 'flex', gap: 14, alignItems: 'baseline', fontSize: 22, fontWeight: 700 }}>
              <span style={{ color: 'var(--kuning)', fontWeight: 800 }}>{e.no}</span><span>{e.teks}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (q.game === 'susun_alur') {
    return (
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(380px, 100%), 1fr))', gap: 12, alignContent: 'start' }}>
        {(q.payload?.langkah || []).map((l) => (
          <div key={l.id} className="kartu" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35 }}>{l.teks}</div>
        ))}
      </div>
    )
  }
  const opsi = daftarOpsi(q)
  return (
    <div className={`opsi-grid ${opsi.length <= 4 ? 'dua' : ''}`} style={{ flex: 1, gridTemplateColumns: opsi.length > 4 ? 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))' : q.game === 'dilema' ? '1fr' : undefined }}>
      {opsi.map((o) => <TombolOpsi key={o.key} o={o} disabled />)}
    </div>
  )
}

function SoalTayang({ q, durasi, sid, totalPemain, onHabis, sibuk }) {
  const [mulai] = useState(() => Date.now())
  const sisa = useSisaWaktu(mulai, durasi)
  const [masuk, setMasuk] = useState(0)
  const dipanggil = useRef(false)
  useEffect(() => {
    const t = setInterval(async () => {
      const { count } = await supabase.from('answers').select('id', { count: 'exact', head: true }).eq('session_id', sid).eq('question_id', q.id)
      setMasuk(count || 0)
    }, 1500)
    return () => clearInterval(t)
  }, [q.id])
  useEffect(() => {
    if (dipanggil.current) return
    if (sisa === 0 || (totalPemain > 0 && masuk >= totalPemain)) { dipanggil.current = true; setTimeout(onHabis, sisa === 0 ? 1500 : 600) }
  }, [sisa, masuk, totalPemain])
  const instruksi = { detektif_spj: 'Temukan bagian yang janggal di HP kalian', susun_alur: 'Susun langkahnya di HP kalian', dilema: 'Apa yang sebaiknya dilakukan? Pilih di HP kalian' }[q.game]
  return (
    <>
      <section className="baris-timer">
        <div className="timer" role="timer" aria-label={`Sisa waktu ${sisa} detik`}>{sisa}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 className="host-soal" style={q.game === 'dilema' ? { fontSize: 'clamp(24px, 2.6vw, 34px)', lineHeight: 1.3 } : undefined}>{q.prompt}</h1>
          {instruksi && <p className="muted" style={{ fontSize: 20, fontWeight: 700 }}>{instruksi}</p>}
        </div>
      </section>
      <KontenSoal q={q} />
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span className="muted" style={{ fontWeight: 700, fontSize: 20 }}><b style={{ color: 'var(--ink)' }}>{masuk}</b> / {totalPemain} menjawab</span>
        <button className="btn sekunder kecil" disabled={sibuk} onClick={() => { dipanggil.current = true; onHabis() }}>Tutup &amp; tampilkan hasil</button>
      </footer>
    </>
  )
}

function Bar({ n, total, warna }) {
  return <div className="bar"><m.div initial={{ width: 0 }} animate={{ width: `${total ? (n / total) * 100 : 0}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ height: '100%', borderRadius: 'var(--radius-sm)', background: warna }} /></div>
}

function Pembahasan({ q, sid, sibuk, onLanjut, onLanjutCerita }) {
  const [rev, setRev] = useState(null)
  const [jawaban, setJawaban] = useState([])
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.rpc('get_reveal', { p_session: sid })
      setRev(data?.[0] || null)
      const { data: a } = await supabase.from('answers').select('jawaban, benar').eq('session_id', sid).eq('question_id', q.id)
      setJawaban(a || [])
    })()
  }, [q.id])
  const kunci = rev?.kunci
  const total = jawaban.length
  const jumlahBenar = jawaban.filter((a) => a.benar).length

  let kiri
  let tombol = <button className="btn tekan" onClick={onLanjut}>Lihat peringkat</button>

  if (q.game === 'detektif_spj') {
    const hitung = {}
    jawaban.forEach((a) => (a.jawaban?.pilihan || []).forEach((no) => { hitung[no] = (hitung[no] || 0) + 1 }))
    kiri = (
      <>
        {(q.payload?.elemen || []).map((e) => {
          const janggal = Array.isArray(kunci) && kunci.includes(e.no)
          return (
            <div key={e.no} className="hasil-baris" style={{ opacity: janggal ? 1 : 0.5, outline: janggal ? '3px solid var(--salah)' : 'none' }}>
              <span className="hasil-label" style={{ flex: '1 1 220px', width: 'auto', fontSize: 19, fontWeight: 700, whiteSpace: 'normal' }}><b style={{ color: 'var(--kuning)' }}>{e.no}.</b> {e.teks}</span>
              <span className="muted" style={{ fontWeight: 800, fontSize: 18 }}>{hitung[e.no] || 0} menandai</span>
              {janggal && <span className="chip salah"><Ikon nama="salah" size={16} />Janggal</span>}
            </div>
          )
        })}
        <p className="muted" style={{ fontWeight: 700, fontSize: 18 }}><b style={{ color: 'var(--toska)' }}>{jumlahBenar} dari {total}</b> menemukan semua kejanggalan</p>
      </>
    )
  } else if (q.game === 'susun_alur') {
    kiri = (
      <>
        <span className="label" style={{ fontSize: 16 }}>Urutan yang benar</span>
        <ol style={{ margin: 0, paddingLeft: 32, display: 'flex', flexDirection: 'column', gap: 10, fontSize: 22, fontWeight: 700, lineHeight: 1.35 }}>
          {urutanBenar(q, kunci).map((t) => <li key={t}>{t}</li>)}
        </ol>
        <p className="muted" style={{ fontWeight: 700, fontSize: 18 }}><b style={{ color: 'var(--toska)' }}>{jumlahBenar} dari {total}</b> menyusun dengan tepat</p>
      </>
    )
  } else {
    const hitung = {}
    jawaban.forEach((a) => { const k = a.jawaban?.pilihan; hitung[k] = (hitung[k] || 0) + 1 })
    const opsi = daftarOpsi(q)
    let mayoritas = null
    if (q.game === 'dilema' && kunci) {
      mayoritas = [...opsi].sort((a, b) => (hitung[b.key] || 0) - (hitung[a.key] || 0) || (kunci[b.key] ?? 0) - (kunci[a.key] ?? 0))[0]
      tombol = <button className="btn tekan" disabled={sibuk || !mayoritas} onClick={() => onLanjutCerita(mayoritas.key, kunci[mayoritas.key] ?? 0)}>Lanjutkan cerita</button>
    }
    kiri = (
      <>
        {opsi.map((o) => {
          const n = hitung[o.key] || 0
          const sorot = q.game === 'dilema' ? mayoritas?.key === o.key : JSON.stringify(o.key) === JSON.stringify(kunci)
          return (
            <div key={o.key} className="hasil-baris" style={{ opacity: sorot ? 1 : 0.55, outline: sorot ? '3px solid var(--toska)' : 'none' }}>
              <span className={`hasil-label ${q.game === 'dilema' ? 'lebar' : ''}`}>{o.huruf ? `${o.huruf} · ` : ''}{o.label}</span>
              <Bar n={n} total={total} warna={`var(--opsi-${o.kelas === 'netral' ? 'a' : o.kelas})`} />
              <span className="hasil-n">{n}</span>
              {q.game === 'dilema' && kunci && <span className={`chip ${kunci[o.key] > 0 ? 'benar' : 'salah'}`}>{tandaEfek(kunci[o.key])}</span>}
              {q.game !== 'dilema' && sorot && <span className="chip benar"><Ikon nama="benar" size={16} />Benar</span>}
            </div>
          )
        })}
        {q.game === 'dilema'
          ? <p className="muted" style={{ fontWeight: 700, fontSize: 18 }}>Suara terbanyak: <b style={{ color: 'var(--toska)' }}>{mayoritas ? `${mayoritas.huruf}` : '-'}</b>. Cerita berlanjut sesuai pilihan ini.</p>
          : <p className="muted" style={{ fontWeight: 700, fontSize: 18 }}><b style={{ color: 'var(--toska)' }}>{hitung[kunci] || 0} dari {total}</b> menjawab benar</p>}
      </>
    )
  }

  const teks = q.game === 'dilema' ? 'Angka di samping tiap pilihan adalah dampaknya ke Indeks Integritas kelompok. Bahas dulu kenapa pilihan itu berdampak begitu, lalu lanjutkan cerita.' : rev?.pembahasan

  return (
    <>
      <h1 className="host-soal" style={{ fontSize: 'clamp(20px, 2.2vw, 30px)', color: 'var(--ink-muted)' }}>{q.prompt}</h1>
      <main style={{ flex: 1, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <section aria-label="Hasil jawaban" style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>{kiri}</section>
        <aside className="kartu-besar" style={{ flex: '0 1 460px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <img className="maskot-bahas" src="/bening-mikir.svg" alt="" width="110" height="110" />
          <span className="label" style={{ color: 'var(--toska)' }}>Kenapa ini penting?</span>
          <p className="teks-bahas">{teks || '…'}</p>
          {(rev?.dasar_hukum || q.dasar_hukum) && <p className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>{rev?.dasar_hukum || q.dasar_hukum}</p>}
          {rev?.refleksi && (
            <div style={{ marginTop: 'auto', padding: '14px 16px', borderRadius: 16, background: 'var(--bg)' }}>
              <span className="label" style={{ color: 'var(--kuning)' }}>Diskusikan</span>
              <p style={{ marginTop: 6, fontSize: 18, lineHeight: 1.4, fontWeight: 700 }}>{rev.refleksi}</p>
            </div>
          )}
        </aside>
      </main>
      <footer style={{ display: 'flex', justifyContent: 'flex-end' }}>{tombol}</footer>
    </>
  )
}

function AkhirCerita({ q, alur, indeks, aksi }) {
  const nada = indeks >= 70 ? 'Integritas terjaga!' : indeks >= 40 ? 'Ada yang perlu dikoreksi.' : 'Integritas runtuh.'
  return (
    <>
      <main style={{ flex: 1, display: 'flex', gap: 'clamp(20px, 4vw, 40px)', alignItems: 'center', flexWrap: 'wrap' }}>
        <section style={{ flex: '1 1 560px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="label" style={{ fontSize: 16 }}>Akhir cerita · {q?.payload?.judul}</span>
          {q && <h1 style={{ fontSize: 'clamp(26px, 2.8vw, 38px)', lineHeight: 1.3, fontWeight: 800 }}>{q.prompt}</h1>}
          {alur.length > 0 && (
            <ol style={{ margin: 0, paddingLeft: 26, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 18, fontWeight: 700 }} className="muted">
              {alur.map((a, i) => <li key={i}>{a.label} <b style={{ color: a.efek > 0 ? 'var(--toska)' : 'var(--salah)' }}>({tandaEfek(a.efek)})</b></li>)}
            </ol>
          )}
          {q?.refleksi && (
            <div className="kartu-besar">
              <span className="label" style={{ color: 'var(--kuning)' }}>Diskusikan</span>
              <p style={{ marginTop: 6, fontSize: 22, lineHeight: 1.4, fontWeight: 700 }}>{q.refleksi}</p>
            </div>
          )}
        </section>
        <aside style={{ flex: '0 1 320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <img src={indeks >= 70 ? '/bening-senang.svg' : indeks >= 40 ? '/bening-mikir.svg' : '/bening-kaget.svg'} alt="" width="200" height="200" />
          <span className="label">Indeks Integritas akhir</span>
          <AngkaNaik nilai={indeks} style={{ fontSize: 96, lineHeight: 1, fontWeight: 800, color: 'var(--kuning)' }} />
          <p style={{ fontSize: 22, fontWeight: 700 }}>{nada}</p>
        </aside>
      </main>
      <footer style={{ display: 'flex', justifyContent: 'flex-end' }}>{aksi}</footer>
    </>
  )
}

function PapanSkor({ pemain, judul, aksi, akhir }) {
  const top = useMemo(() => pemain.slice(0, 5), [pemain])
  return (
    <>
      <main style={{ flex: 1, display: 'flex', gap: 'clamp(20px, 4vw, 40px)', alignItems: 'center', flexWrap: 'wrap' }}>
        <section style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{ fontSize: 'clamp(36px, 4.4vw, 56px)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 8 }}>{judul}</h1>
          {top.map((p, i) => (
            <m.div key={p.id} layout transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              initial={{ opacity: 0, x: -48 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.09, duration: 0.45, ease: 'easeOut' } }}
              className={`baris-skor ${i === 0 ? 'juara' : ''}`}>
              <span style={{ minWidth: 28, fontWeight: 800 }}>{i + 1}</span>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{p.nama}</span>
              {p.streak >= 2 && <span className="chip" style={{ background: i === 0 ? '#0E1A30' : 'var(--line)', color: 'var(--kuning)' }}><Ikon nama="api" size={16} />{p.streak} beruntun</span>}
              <AngkaNaik nilai={p.skor} style={{ minWidth: 80, textAlign: 'right', fontWeight: 800 }} />
            </m.div>
          ))}
          {top.length === 0 && <p className="muted">Belum ada peserta.</p>}
        </section>
        <aside style={{ flex: '0 1 300px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
          <img src="/bening-senang.svg" alt="" width="220" height="220" />
          {top[0] && <p style={{ fontSize: 22, lineHeight: 1.35, fontWeight: 700 }}>{akhir ? `Selamat, ${top[0].nama}!` : `${top[0].nama} memimpin!`}</p>}
        </aside>
      </main>
      <footer style={{ display: 'flex', justifyContent: 'flex-end' }}>{aksi}</footer>
    </>
  )
}
