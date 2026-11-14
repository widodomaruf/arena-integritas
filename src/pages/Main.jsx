import { useEffect, useRef, useState } from 'react'
import { supabase, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'
import { daftarOpsi, TombolOpsi, Ikon, useSisaWaktu } from '../components/Opsi.jsx'

const angka = (n) => (n ?? 0).toLocaleString('id-ID')

export default function Main({ sid }) {
  const [sesi, setSesi] = useState(null)
  const [saya, setSaya] = useState(null)
  const [q, setQ] = useState(null)
  const [diterima, setDiterima] = useState(null)
  const [jawab, setJawab] = useState(null)
  const [reveal, setReveal] = useState(null)
  const [peringkat, setPeringkat] = useState(null)
  const [err, setErr] = useState('')
  const [kirim, setKirim] = useState(false)
  const qid = useRef(null)

  async function muatSesi() {
    const { data } = await supabase.from('sessions').select('*').eq('id', sid).maybeSingle()
    if (data) setSesi(data)
    return data
  }
  async function muatSaya() {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) return null
    const { data } = await supabase.from('players').select('*').eq('session_id', sid).eq('auth_uid', u.user.id).maybeSingle()
    setSaya(data)
    return data
  }

  useEffect(() => {
    let ch
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) return pindah('/')
      const s = await muatSesi()
      const me = await muatSaya()
      if (!s || !me) return pindah('/')
      ch = supabase.channel(`sesi-${sid}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sid}` }, (p) => setSesi(p.new))
        .subscribe()
    })()
    const cadangan = setInterval(muatSesi, 5000) // jaga-jaga kalau koneksi realtime putus
    return () => { clearInterval(cadangan); if (ch) supabase.removeChannel(ch) }
  }, [sid])

  // Soal baru ditayangkan
  useEffect(() => {
    const id = sesi?.current_question_id
    if (!id || id === qid.current) return
    qid.current = id
    setJawab(null); setReveal(null); setErr('')
    ;(async () => {
      const { data } = await supabase.from('questions').select('id, game, prompt, payload, durasi_detik').eq('id', id).single()
      setQ(data)
      setDiterima(Date.now()) // timer tampilan; batas waktu sebenarnya dijaga server
      if (saya) {
        const { data: a } = await supabase.from('answers').select('jawaban, benar, poin').eq('question_id', id).eq('player_id', saya.id).maybeSingle()
        if (a) setJawab({ pilihan: a.jawaban?.pilihan, benar: a.benar, poin: a.poin })
      }
    })()
  }, [sesi?.current_question_id, saya?.id])

  // Jawaban dibuka / sesi selesai
  useEffect(() => {
    if (!sesi || !['reveal', 'ended'].includes(sesi.status)) return
    ;(async () => {
      if (sesi.current_question_id) {
        const { data } = await supabase.rpc('get_reveal', { p_session: sid })
        if (data?.[0]) setReveal(data[0])
      }
      const me = await muatSaya()
      const { data: semua } = await supabase.from('players').select('id, skor').eq('session_id', sid).order('skor', { ascending: false })
      if (semua && me) setPeringkat({ posisi: semua.findIndex((p) => p.id === me.id) + 1, total: semua.length })
    })()
  }, [sesi?.status, sesi?.current_question_id])

  const sisa = useSisaWaktu(sesi?.status === 'running' ? diterima : null, q?.durasi_detik ?? 20)

  async function pilih(key) {
    if (jawab || kirim) return
    setKirim(true); setErr('')
    try {
      const { data, error } = await supabase.rpc('submit_answer', { p_session: sid, p_question: q.id, p_jawaban: { pilihan: key } })
      if (error) throw error
      const r = data[0]
      setJawab({ pilihan: key, benar: r.benar, poin: r.poin })
      setSaya((s) => ({ ...s, skor: r.skor, streak: r.streak }))
    } catch (e) {
      setErr(/Waktu habis/.test(e.message) ? 'Waktu habis.' : pesanError(e))
    } finally { setKirim(false) }
  }

  if (!sesi || !saya) return <Layar><p className="muted" style={{ margin: 'auto' }}>Memuat…</p></Layar>

  const footer = (
    <footer style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }} className="muted">
      <span>{saya.nama}</span><span>Skor <b style={{ color: 'var(--ink)' }}>{angka(saya.skor)}</b></span>
    </footer>
  )

  if (sesi.status === 'ended') {
    return (
      <Layar tengah>
        <img src="/bening-senang.svg" alt="Bening senang" width="180" height="180" />
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Permainan selesai!</h1>
        <div className="kartu-besar" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
          <span className="label">Skor akhir</span>
          <span style={{ fontSize: 40, fontWeight: 800 }}>{angka(saya.skor)}</span>
          {peringkat && <span className="muted" style={{ fontWeight: 700 }}>Posisi {peringkat.posisi} dari {peringkat.total}</span>}
        </div>
        <p style={{ fontWeight: 700 }}>Terima kasih sudah main jujur. Kalau ragu, tolak dan laporkan.</p>
        <button className="btn sekunder kecil" onClick={() => pindah('/')}>Gabung sesi lain</button>
      </Layar>
    )
  }

  if (sesi.status === 'lobby' || !q) {
    return (
      <Layar tengah>
        <img src="/bening-mikir.svg" alt="Bening menunggu" width="160" height="160" />
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>Kamu sudah masuk, {saya.nama}!</h1>
        <p className="muted" style={{ fontWeight: 700 }}>Lihat namamu di layar depan. Permainan mulai saat fasilitator siap.</p>
        {footer}
      </Layar>
    )
  }

  if (sesi.status === 'reveal') {
    const benar = jawab?.benar
    const opsiBenar = daftarOpsi(q).find((o) => reveal && JSON.stringify(o.key) === JSON.stringify(reveal.kunci))
    return (
      <Layar tengah warna={benar ? 'var(--toska)' : undefined}>
        <span className={`chip ${benar ? 'benar' : 'salah'}`} style={benar ? { background: '#14284B', color: '#fff' } : undefined}>
          <Ikon nama={benar ? 'benar' : 'salah'} size={18} />{benar ? 'Benar' : jawab ? 'Belum tepat' : 'Tidak menjawab'}
        </span>
        <img src={benar ? '/bening-senang.svg' : '/bening-kaget.svg'} alt="" width="160" height="160" />
        <h1 style={{ fontSize: 26, fontWeight: 800, color: benar ? '#14284B' : undefined }}>{benar ? 'Mantap, jawabanmu tepat!' : 'Tidak apa-apa, ini kesempatan belajar.'}</h1>
        {benar && <div className="kartu-besar" style={{ padding: '14px 28px', color: '#14284B', background: '#fff' }}><span style={{ fontSize: 36, fontWeight: 800 }}>+{angka(jawab.poin)}</span></div>}
        {!benar && opsiBenar && (
          <div className="kartu" style={{ width: '100%', textAlign: 'left' }}>
            <span className="label">Jawaban yang benar</span>
            <p style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{opsiBenar.huruf ? `${opsiBenar.huruf} · ` : ''}{opsiBenar.label}</p>
          </div>
        )}
        {reveal?.pembahasan && (
          <div className="kartu" style={{ width: '100%', textAlign: 'left', color: 'var(--ink)' }}>
            <p style={{ fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>{reveal.pembahasan}</p>
            {reveal.dasar_hukum && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{reveal.dasar_hukum}</p>}
          </div>
        )}
        {peringkat && <p style={{ fontWeight: 700, color: benar ? '#14284B' : undefined }}>Posisi {peringkat.posisi} dari {peringkat.total}</p>}
      </Layar>
    )
  }

  // status running
  if (jawab || sisa === 0) {
    return (
      <Layar tengah>
        <img src="/bening-mikir.svg" alt="" width="150" height="150" />
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{jawab ? 'Jawaban terkirim!' : 'Waktu habis'}</h1>
        <p className="muted" style={{ fontWeight: 700 }}>Tunggu pembahasan di layar depan.</p>
        {footer}
      </Layar>
    )
  }

  const opsi = daftarOpsi(q)
  return (
    <Layar>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="label">{q.game === 'terima_tolak' ? 'Terima atau Tolak?' : q.game === 'tebak_delik' ? 'Tebak Delik' : 'Kuis Live'}</span>
        <span className="chip kuning"><Ikon nama="jam" size={16} />{sisa} dtk</span>
      </header>
      <div className="kartu"><p style={{ fontSize: 20, lineHeight: 1.35, fontWeight: 700 }}>{q.prompt}</p></div>
      <div className="opsi-grid" style={{ flex: 1, alignContent: 'start' }}>
        {opsi.map((o) => <TombolOpsi key={o.key} o={o} disabled={kirim} onClick={() => pilih(o.key)} />)}
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      {footer}
    </Layar>
  )
}

function Layar({ children, tengah, warna }) {
  return (
    <div className="halaman" style={warna ? { background: warna } : undefined}>
      <main className="hp" style={tengah ? { alignItems: 'center', textAlign: 'center', justifyContent: 'center' } : undefined}>{children}</main>
    </div>
  )
}
