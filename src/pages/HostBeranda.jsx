import { useEffect, useState } from 'react'
import { supabase, GAMES, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'

export default function HostBeranda() {
  const [user, setUser] = useState(undefined)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user && !data.user.is_anonymous ? data.user : null))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user && !s.user.is_anonymous ? s.user : null))
    return () => sub.subscription.unsubscribe()
  }, [])
  if (user === undefined) return <div className="host"><p className="muted">Memuat…</p></div>
  return user ? <Panel user={user} /> : <Masuk />
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

function Masuk() {
  const [mode, setMode] = useState('masuk')
  const [email, setEmail] = useState('')
  const [sandi, setSandi] = useState('')
  const [pesan, setPesan] = useState('')
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function masukGoogle() {
    setErr(''); setSibuk(true)
    try {
      const { data: cur } = await supabase.auth.getSession()
      if (cur.session?.user?.is_anonymous) await supabase.auth.signOut()
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/host` } })
      if (error) throw error
    } catch (e2) {
      setErr(/provider is not enabled/i.test(e2.message) ? 'Login Google belum diaktifkan di Supabase.' : pesanError(e2))
      setSibuk(false)
    }
  }

  async function kirim(e) {
    e.preventDefault(); setErr(''); setPesan(''); setSibuk(true)
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
      setErr(/Invalid login/i.test(e2.message) ? 'Email atau kata sandi salah.' : /not confirmed/i.test(e2.message) ? 'Email belum dikonfirmasi. Cek kotak masuk email kamu.' : pesanError(e2))
    } finally { setSibuk(false) }
  }

  return (
    <div className="host">
      <Kepala />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={kirim} className="kartu-besar" style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>{mode === 'masuk' ? 'Masuk sebagai fasilitator' : 'Daftar akun fasilitator'}</h1>
          <button type="button" className="btn tekan" onClick={masukGoogle} disabled={sibuk}
            style={{ background: '#FFFFFF', color: '#14284B', boxShadow: 'none', border: '2px solid var(--line)' }}>
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Lanjut dengan Google
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="muted"><span style={{ flex: 1, height: 1, background: 'var(--line)' }} />atau pakai email<span style={{ flex: 1, height: 1, background: 'var(--line)' }} /></div>
          <label className="field">EMAIL<input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label className="field">KATA SANDI<input className="input" type="password" required minLength={8} autoComplete={mode === 'masuk' ? 'current-password' : 'new-password'} value={sandi} onChange={(e) => setSandi(e.target.value)} /></label>
          {err && <p className="error" role="alert">{err}</p>}
          {pesan && <p style={{ fontWeight: 700, color: 'var(--toska)' }} role="status">{pesan}</p>}
          <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Sebentar…' : mode === 'masuk' ? 'Masuk' : 'Daftar'}</button>
          <button type="button" className="btn sekunder kecil" onClick={() => setMode(mode === 'masuk' ? 'daftar' : 'masuk')}>
            {mode === 'masuk' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
          </button>
        </form>
      </main>
    </div>
  )
}

function Panel({ user }) {
  const [bank, setBank] = useState(null)
  const [jumlah, setJumlah] = useState({})
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
        const { data: qs } = await supabase.from('questions').select('game').eq('bank_id', b.id)
        const c = {}; (qs || []).forEach((x) => { c[x.game] = (c[x.game] || 0) + 1 }); setJumlah(c)
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
      const { data: qs } = await supabase.from('questions').select('id').eq('bank_id', bank.id).eq('game', game).order('urutan')
      let ids = (qs || []).map((x) => x.id)
      if (acak) ids = ids.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1])
      ids = ids.slice(0, n)
      try { localStorage.setItem(`ai_sesi_${data.id}`, JSON.stringify(ids)) } catch {}
      pindah(`/host/${data.id}`)
    } catch (e) { setErr(pesanError(e)) } finally { setSibuk(false) }
  }

  return (
    <div className="host">
      <Kepala kanan={<button className="btn sekunder kecil" onClick={() => supabase.auth.signOut()}>Keluar</button>} />
      <main style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 960, width: '100%', margin: '0 auto' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800 }}>Buat sesi baru</h1>
        <p className="muted" style={{ fontWeight: 700 }}>{bank ? bank.judul : 'Memuat bank soal…'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {Object.entries(GAMES).map(([k, g]) => (
            <button key={k} type="button" onClick={() => setGame(k)} aria-pressed={game === k} className="kartu-besar"
              style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', border: `3px solid ${game === k ? 'var(--toska)' : 'transparent'}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{g.nama}</span>
              <span className="muted" style={{ fontWeight: 600 }}>{g.ket}</span>
              <span className="label" style={{ marginTop: 8 }}>{jumlah[k] ?? 0} soal tersedia</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>JUMLAH SOAL
            <select className="input" style={{ width: 120, height: 48, fontSize: 18 }} value={n} onChange={(e) => setN(Number(e.target.value))}>
              {[5, 10, 15, 20, 99].map((v) => <option key={v} value={v}>{v === 99 ? 'Semua' : v}</option>)}
            </select>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
            <input type="checkbox" checked={acak} onChange={(e) => setAcak(e.target.checked)} style={{ width: 22, height: 22 }} /> Acak urutan soal
          </label>
          <button className="btn tekan" style={{ marginLeft: 'auto' }} disabled={!bank || sibuk} onClick={buat}>{sibuk ? 'Membuat…' : 'Buka lobi'}</button>
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
    </div>
  )
}
