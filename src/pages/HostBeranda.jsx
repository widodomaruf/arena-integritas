import { Kredit, URL_PANDUAN } from '../components/Kredit.jsx'
import { TombolInstal } from '../components/Instal.jsx'
import { Avatar } from '../components/Avatar.jsx'
import Profil, { ambilProfil } from './Profil.jsx'
import { useEffect, useId, useState } from 'react'
import { supabase, GAMES, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'

export default function HostBeranda({ profil }) {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user && !data.user.is_anonymous ? data.user : null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user && !s.user.is_anonymous ? s.user : null))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (user === undefined) return <div className="host"><p className="muted">Memuat…</p></div>
  if (!user) return <Masuk />
  return profil ? <HalamanProfil user={user} /> : <Panel user={user} />
}

function ChipProfil({ user }) {
  const [p, setP] = useState(null)
  useEffect(() => { ambilProfil(user.id).then(setP).catch(() => {}) }, [user.id])
  return (
    <button type="button" className="chip-profil" onClick={() => pindah('/host/profil')}>
      <Avatar id={p?.avatar || 'p1'} size={36} />
      <span>{p?.nama || 'Lengkapi profil'}</span>
    </button>
  )
}

function KananPanel({ user, tanpaChip }) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      <TombolInstal gelap />
      <TautanPanduan />
      {!tanpaChip && <ChipProfil user={user} />}
      <button className="btn sekunder kecil" onClick={() => supabase.auth.signOut()}>Keluar</button>
    </div>
  )
}

function HalamanProfil({ user }) {
  return (
    <div className="host">
      <Kepala kanan={<KananPanel user={user} tanpaChip />} />
      <main style={{ flex: 1 }}><Profil user={user} /></main>
      <Kredit />
    </div>
  )
}

function Kepala({ kanan }) {
  return (
    <header className="host-header">
      <div className="brand">
        <img src="/logo-arnitas-on-dark.svg" alt="Arnitas" style={{ width: 178, height: 44 }} />
        <span className="muted" style={{ fontSize: 14, fontWeight: 700, borderLeft: '2px solid var(--line)', paddingLeft: 14 }}>Ruang fasilitator</span>
      </div>
      {kanan}
    </header>
  )
}

function TautanPanduan() {
  return <a href={URL_PANDUAN} target="_blank" rel="noopener noreferrer" className="btn sekunder kecil">Buka panduan</a>
}

function TautanGabung() {
  return <>
    <TautanPanduan />
    <a href="/" onClick={(e) => { e.preventDefault(); pindah('/') }} className="btn sekunder kecil">← Kembali ke halaman PIN</a>
  </>
}

function InputSandi({ label, value, onChange, onBlur, autoComplete, galat }) {
  const [lihat, setLihat] = useState(false)
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} className="input" type={lihat ? 'text' : 'password'} required minLength={8} autoComplete={autoComplete}
          aria-invalid={!!galat} aria-describedby={galat ? `${id}-galat` : undefined}
          value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} style={{ paddingRight: 116 }} />
        <button type="button" onClick={() => setLihat(!lihat)} aria-pressed={lihat} aria-controls={id}
          aria-label={`${lihat ? 'Sembunyikan' : 'Lihat'} ${label.toLowerCase()}`}
          style={{ position: 'absolute', right: 6, top: 6, bottom: 6, minWidth: 100, border: 'none', borderRadius: 10, background: 'var(--line)', color: 'var(--ink)', font: 'inherit', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          {lihat ? 'Sembunyikan' : 'Lihat'}
        </button>
      </div>
      {galat && <p id={`${id}-galat`} className="error" style={{ letterSpacing: 0 }}>{galat}</p>}
    </div>
  )
}

function Masuk() {
  const [mode, setMode] = useState('masuk')
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [ulang, setUlang] = useState('')
  const [pesan, setPesan] = useState('')
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState({})
  const hapusGalat = (k) => setGalat((g) => ({ ...g, [k]: '' }))
  const cekBlur = (k) => {
    let m = ''
    if (k === 'email' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) m = 'Format email belum lengkap, contoh nama@gmail.com.'
    if (k === 'sandi' && sandi && sandi.length < 8) m = `Kata sandi baru ${sandi.length} karakter. Tambah hingga minimal 8.`
    if (k === 'ulang' && ulang && ulang !== sandi) m = 'Belum sama dengan kata sandi di atas. Periksa dengan tombol Lihat.'
    setGalat((g) => ({ ...g, [k]: m }))
  }

  async function kirim(e) {
    e.preventDefault(); setErr(''); setPesan('')
    if (mode === 'daftar' && sandi !== ulang) { setErr('Kedua kata sandi belum sama. Periksa lagi dengan tombol Lihat.'); return }
    setSibuk(true)
    try {
      const { data: cur } = await supabase.auth.getSession()
      if (cur.session?.user?.is_anonymous) await supabase.auth.signOut()
      if (mode === 'daftar') {
        const { data, error } = await supabase.auth.signUp({ email, password: sandi, options: { emailRedirectTo: `${window.location.origin}/host` } })
        if (error) throw error
        if (!data.session) setPesan('Cek email kamu untuk konfirmasi akun, lalu kembali ke halaman ini dan masuk.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: sandi })
        if (error) throw error
      }
    } catch (e2) {
      setErr(/Invalid login/i.test(e2.message) ? 'Email atau kata sandi belum cocok. Periksa dengan tombol Lihat, lalu masuk ulang.' : /not confirmed/i.test(e2.message) ? 'Email belum dikonfirmasi. Cek kotak masuk email kamu.' : pesanError(e2))
    } finally { setSibuk(false) }
  }

  return (
    <div className="host">
      <Kepala kanan={<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><TombolInstal gelap /><TautanGabung /></div>} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={kirim} className="kartu-besar" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{mode === 'masuk' ? 'Masuk sebagai fasilitator' : 'Daftar akun fasilitator'}</h1>
          <label className="field">EMAIL<input className="input" type="email" required autoComplete="email" value={email}
            aria-invalid={!!galat.email} aria-describedby={galat.email ? 'galat-email' : undefined}
            onBlur={() => cekBlur('email')} onChange={(e) => { setEmail(e.target.value); hapusGalat('email') }} /></label>
          {galat.email && <p id="galat-email" className="error">{galat.email}</p>}
          <InputSandi label="KATA SANDI" value={sandi} galat={mode === 'daftar' ? galat.sandi : ''} onBlur={() => cekBlur('sandi')}
            onChange={(v) => { setSandi(v); hapusGalat('sandi'); hapusGalat('ulang') }} autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} />
          {mode === 'daftar' && <>
            <InputSandi label="ULANGI KATA SANDI" value={ulang} galat={galat.ulang} onBlur={() => cekBlur('ulang')}
              onChange={(v) => { setUlang(v); hapusGalat('ulang') }} autoComplete="new-password" />
            {!galat.ulang && <p className="muted" style={{ fontSize: 14, margin: 0 }} aria-live="polite">
              {ulang && ulang === sandi && sandi.length >= 8 ? '✓ Kata sandi sudah sama.' : 'Minimal 8 karakter. Simpan baik-baik, belum ada fitur lupa kata sandi.'}
            </p>}
          </>}
          {err && <p className="error" role="alert">{err}</p>}
          {pesan && <p style={{ fontWeight: 700, color: 'var(--toska)' }} role="status">{pesan}</p>}
          <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Sebentar…' : mode === 'masuk' ? 'Masuk' : 'Daftar'}</button>
          <button type="button" className="btn sekunder kecil" onClick={() => { setMode(mode === 'masuk' ? 'daftar' : 'masuk'); setUlang(''); setErr(''); setGalat({}) }}>
            {mode === 'masuk' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </form>
      </main>
      <Kredit />
    </div>
  )
}

function Panel({ user }) {
  const [bank, setBank] = useState(null)
  const [jumlah, setJumlah] = useState({})
  const [cerita, setCerita] = useState([])
  const [skenario, setSkenario] = useState('')
  const [game, setGame] = useState('kuis_live')
  const [n, setN] = useState(10)
  const [acak, setAcak] = useState(true)
  const [riwayat, setRiwayat] = useState([])
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: b } = await supabase.from('question_banks').select('id, judul').order('created_at').limit(1).maybeSingle()
      setBank(b)
      if (b) {
        const { data: qs } = await supabase.from('questions').select('game, payload').eq('bank_id', b.id)
        const c = {}; const daftar = []
        ;(qs || []).forEach((x) => {
          c[x.game] = (c[x.game] || 0) + 1
          if (x.game === 'dilema' && x.payload?.node === 'N1') daftar.push({ id: x.payload.skenario_id, judul: x.payload.judul })
        })
        daftar.sort((p, q) => p.id.localeCompare(q.id))
        setJumlah(c); setCerita(daftar); setSkenario(daftar[0]?.id || '')
      }
      const { data: s } = await supabase.from('sessions').select('id, pin, game, status, created_at').eq('host_id', user.id).neq('status', 'ended').order('created_at', { ascending: false }).limit(5)
      setRiwayat(s || [])
    })()
  }, [user.id])

  async function buat() {
    setErr(''); setSibuk(true)
    try {
      const { data, error } = await supabase.rpc('create_session', { p_bank: bank.id, p_game: game })
      if (error) throw error
      const { data: qs } = await supabase.from('questions').select('id, payload').eq('bank_id', bank.id).eq('game', game).order('urutan')
      let ids
      if (game === 'dilema') {
        ids = (qs || []).filter((x) => x.payload?.skenario_id === skenario).map((x) => x.id)
      } else {
        ids = (qs || []).map((x) => x.id)
        if (acak) ids = ids.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1])
        ids = ids.slice(0, n)
      }
      try { localStorage.setItem(`ai_sesi_${data.id}`, JSON.stringify(ids)) } catch {}
      pindah(`/host/${data.id}`)
    } catch (e) { setErr(pesanError(e)) } finally { setSibuk(false) }
  }

  const ketJumlah = (k) => (k === 'dilema' ? `${cerita.length} cerita` : `${jumlah[k] ?? 0} soal tersedia`)

  return (
    <div className="host">
      <Kepala kanan={<KananPanel user={user} />} />
      <main style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1040, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800 }}>Buat sesi baru</h1>
        <p className="muted" style={{ fontWeight: 700 }}>{bank ? bank.judul : 'Memuat bank soal…'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {Object.entries(GAMES).map(([k, g]) => (
            <button key={k} type="button" onClick={() => setGame(k)} aria-pressed={game === k} className="kartu-besar"
              style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', border: `3px solid ${game === k ? 'var(--toska)' : 'transparent'}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{g.nama}</span>
              <span className="muted" style={{ fontWeight: 600 }}>{g.ket}</span>
              <span className="label" style={{ marginTop: 8 }}>{ketJumlah(k)}</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {game === 'dilema' ? (
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>CERITA
              <select className="input" style={{ width: 320, height: 48, fontSize: 18 }} value={skenario} onChange={(e) => setSkenario(e.target.value)}>
                {cerita.map((c) => <option key={c.id} value={c.id}>{c.judul}</option>)}
              </select>
            </label>
          ) : (
            <>
              <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>JUMLAH SOAL
                <select className="input" style={{ width: 120, height: 48, fontSize: 18 }} value={n} onChange={(e) => setN(Number(e.target.value))}>
                  {[3, 5, 10, 15, 20, 99].map((v) => <option key={v} value={v}>{v === 99 ? 'Semua' : v}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                <input type="checkbox" checked={acak} onChange={(e) => setAcak(e.target.checked)} style={{ width: 22, height: 22 }} /> Acak urutan soal
              </label>
            </>
          )}
          <button className="btn tekan" style={{ marginLeft: 'auto' }} disabled={!bank || sibuk || (game === 'dilema' && !skenario)} onClick={buat}>{sibuk ? 'Membuat…' : 'Buka lobi'}</button>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        {riwayat.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2 className="label">Sesi yang masih terbuka</h2>
            {riwayat.map((s) => (
              <a key={s.id} href={`/host/${s.id}`} onClick={(e) => { e.preventDefault(); pindah(`/host/${s.id}`) }} className="baris-skor" style={{ textDecoration: 'none', color: 'var(--ink)', fontSize: 18 }}>
                <span style={{ fontWeight: 800 }}>PIN {s.pin}</span><span className="muted" style={{ flex: 1 }}>{GAMES[s.game]?.nama ?? s.game}</span><span className="label">{s.status}</span>
              </a>
            ))}
          </section>
        )}
      </main>
      <Kredit />
    </div>
  )
}
