import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { supabase, GAMES, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'
import { daftarOpsi, TombolOpsi, Ikon, useSisaWaktu } from '../components/Opsi.jsx'

const angka = (n) => (n ?? 0).toLocaleString('id-ID')
const pinSpasi = (p) => (p ? `${p.slice(0, 3)} ${p.slice(3)}` : '')

export default function HostSesi({ sid }) {
  const [sesi, setSesi] = useState(null)
  const [soal, setSoal] = useState([])
  const [pemain, setPemain] = useState([])
  const [qr, setQr] = useState('')
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [tampilSkor, setTampilSkor] = useState(false)

  const urlGabung = `${window.location.origin}/?pin=${sesi?.pin ?? ''}`

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
      const { data: qs } = await supabase.from('questions').select('id, kode, game, prompt, payload, durasi_detik').eq('bank_id', s.bank_id).eq('game', s.game).order('urutan')
      let urut = null
      try { urut = JSON.parse(localStorage.getItem(`ai_sesi_${sid}`) || 'null') } catch {}
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

  async function aksi(fn) {
    setErr(''); setSibuk(true)
    try { const { data, error } = await fn(); if (error) throw error; if (data) setSesi(Array.isArray(data) ? data[0] : data) }
    catch (e) { setErr(pesanError(e)) } finally { setSibuk(false) }
  }
  const tayang = (i) => { setTampilSkor(false); return aksi(() => supabase.rpc('host_show_question', { p_session: sid, p_question: soal[i].id })) }
  const buka = () => aksi(() => supabase.rpc('host_set_status', { p_session: sid, p_status: 'reveal' }))
  const selesai = () => aksi(() => supabase.rpc('host_set_status', { p_session: sid, p_status: 'ended' }))

  if (err && !sesi) return <div className="host"><p className="error">{err}</p><button className="btn kecil" onClick={() => pindah('/host')}>Kembali</button></div>
  if (!sesi) return <div className="host"><p className="muted">Memuat…</p></div>

  const kepala = (
    <header className="host-header">
      <div className="brand">
        <img src="/logo-mark-on-dark.svg" alt="" />
        <span className="label" style={{ fontSize: 16 }}>
          {sesi.status === 'lobby' ? GAMES[sesi.game]?.nama : q ? `Soal ${idx + 1} dari ${soal.length}` : GAMES[sesi.game]?.nama} · PIN {pinSpasi(sesi.pin)}
        </span>
      </div>
      <span className="muted" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 18 }}>
        <Ikon nama="orang" size={22} /> {pemain.length} peserta
      </span>
    </header>
  )

  let isi
  if (sesi.status === 'lobby') {
    isi = (
      <>
        <main style={{ flex: 1, display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <button className="btn tekan" disabled={sibuk || soal.length === 0 || pemain.length === 0} onClick={() => tayang(0)}>Mulai</button>
        </footer>
      </>
    )
  } else if (sesi.status === 'running' && q) {
    isi = <SoalTayang key={q.id} q={q} sid={sid} totalPemain={pemain.length} onHabis={buka} sibuk={sibuk} />
  } else if (sesi.status === 'reveal' && q && !tampilSkor) {
    isi = <Pembahasan key={q.id} q={q} sid={sid} onLanjut={() => setTampilSkor(true)} />
  } else if (sesi.status === 'reveal' && q && tampilSkor) {
    const terakhir = idx >= soal.length - 1
    isi = <PapanSkor pemain={pemain} judul="Papan Skor" aksi={
      <button className="btn tekan" disabled={sibuk} onClick={() => (terakhir ? selesai() : tayang(idx + 1))}>{terakhir ? 'Lihat juara' : 'Soal berikutnya'}</button>
    } />
  } else {
    isi = <PapanSkor pemain={pemain} judul="Juara Arnitas" akhir aksi={
      <button className="btn sekunder kecil" onClick={() => pindah('/host')}>Kembali ke ruang fasilitator</button>
    } />
  }

  return (
    <div className="host">
      {kepala}
      {isi}
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  )
}

function SoalTayang({ q, sid, totalPemain, onHabis, sibuk }) {
  const [mulai] = useState(() => Date.now())
  const sisa = useSisaWaktu(mulai, q.durasi_detik)
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
  const opsi = daftarOpsi(q)
  return (
    <>
      <section style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div className="timer" role="timer" aria-label={`Sisa waktu ${sisa} detik`}>{sisa}</div>
        <h1 className="host-soal">{q.prompt}</h1>
      </section>
      <div className={`opsi-grid ${opsi.length <= 4 ? 'dua' : ''}`} style={{ flex: 1, gridTemplateColumns: opsi.length > 4 ? 'repeat(auto-fit, minmax(320px, 1fr))' : undefined }}>
        {opsi.map((o) => <TombolOpsi key={o.key} o={o} disabled />)}
      </div>
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="muted" style={{ fontWeight: 700, fontSize: 20 }}><b style={{ color: 'var(--ink)' }}>{masuk}</b> / {totalPemain} menjawab</span>
        <button className="btn sekunder kecil" disabled={sibuk} onClick={() => { dipanggil.current = true; onHabis() }}>Tutup &amp; tampilkan jawaban</button>
      </footer>
    </>
  )
}

function Pembahasan({ q, sid, onLanjut }) {
  const [rev, setRev] = useState(null)
  const [sebaran, setSebaran] = useState({})
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.rpc('get_reveal', { p_session: sid })
      setRev(data?.[0] || null)
      const { data: a } = await supabase.from('answers').select('jawaban').eq('session_id', sid).eq('question_id', q.id)
      const c = {}; (a || []).forEach((x) => { const k = x.jawaban?.pilihan; c[k] = (c[k] || 0) + 1 }); setSebaran(c)
    })()
  }, [q.id])
  const opsi = daftarOpsi(q)
  const total = Object.values(sebaran).reduce((s, v) => s + v, 0)
  const benarKey = rev ? rev.kunci : null
  const jumlahBenar = benarKey != null ? sebaran[benarKey] || 0 : 0
  return (
    <>
      <h1 className="host-soal" style={{ fontSize: 'clamp(22px, 2.4vw, 32px)', color: 'var(--ink-muted)' }}>{q.prompt}</h1>
      <main style={{ flex: 1, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        <section aria-label="Sebaran jawaban" style={{ flex: '1 1 480px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {opsi.map((o) => {
            const n = sebaran[o.key] || 0, ok = o.key === benarKey
            return (
              <div key={o.key} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: ok ? 1 : 0.5, padding: ok ? '8px 12px' : 0, margin: ok ? '0 -12px' : 0, borderRadius: 16, outline: ok ? '3px solid var(--toska)' : 'none' }}>
                <span style={{ width: 220, fontSize: 18, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.huruf ? `${o.huruf} · ` : ''}{o.label}</span>
                <div className="bar"><div style={{ width: `${total ? (n / total) * 100 : 0}%`, background: `var(--opsi-${o.kelas === 'netral' ? 'a' : o.kelas})` }} /></div>
                <span style={{ width: 36, textAlign: 'right', fontSize: 22, fontWeight: 800 }}>{n}</span>
                {ok && <span className="chip benar"><Ikon nama="benar" size={16} />Benar</span>}
              </div>
            )
          })}
          <p className="muted" style={{ fontWeight: 700, fontSize: 18 }}><b style={{ color: 'var(--toska)' }}>{jumlahBenar} dari {total}</b> menjawab benar</p>
        </section>
        <aside className="kartu-besar" style={{ flex: '0 1 480px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <img src="/bening-mikir.svg" alt="" width="110" height="110" style={{ position: 'absolute', right: 12, top: -28 }} />
          <span className="label" style={{ color: 'var(--toska)' }}>Kenapa ini penting?</span>
          <p style={{ paddingRight: 90, fontSize: 21, lineHeight: 1.4, fontWeight: 700 }}>{rev?.pembahasan || '…'}</p>
          {rev?.dasar_hukum && <p className="muted" style={{ fontSize: 15, lineHeight: 1.5 }}>{rev.dasar_hukum}</p>}
          {rev?.refleksi && (
            <div style={{ marginTop: 'auto', padding: '14px 16px', borderRadius: 16, background: 'var(--bg)' }}>
              <span className="label" style={{ color: 'var(--kuning)' }}>Diskusikan</span>
              <p style={{ marginTop: 6, fontSize: 18, lineHeight: 1.4, fontWeight: 700 }}>{rev.refleksi}</p>
            </div>
          )}
        </aside>
      </main>
      <footer style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn tekan" onClick={onLanjut}>Lihat peringkat</button>
      </footer>
    </>
  )
}

function PapanSkor({ pemain, judul, aksi, akhir }) {
  const top = useMemo(() => pemain.slice(0, 5), [pemain])
  return (
    <>
      <main style={{ flex: 1, display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap' }}>
        <section style={{ flex: '1 1 520px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h1 style={{ fontSize: 'clamp(36px, 4.4vw, 56px)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 8 }}>{judul}</h1>
          {top.map((p, i) => (
            <div key={p.id} className={`baris-skor ${i === 0 ? 'juara' : ''}`}>
              <span style={{ width: 36, fontWeight: 800 }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{p.nama}</span>
              {p.streak >= 2 && <span className="chip" style={{ background: i === 0 ? '#0E1A30' : 'var(--line)', color: 'var(--kuning)' }}><Ikon nama="api" size={16} />{p.streak} beruntun</span>}
              <span style={{ width: 120, textAlign: 'right', fontWeight: 800 }}>{angka(p.skor)}</span>
            </div>
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
