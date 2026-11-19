import { useEffect, useRef, useState } from 'react'
import { supabase, pesanError, GAMES, NAMA_SESI, durasiEfektif } from '../supabase.js'
import { pindah } from '../App.jsx'
import { daftarOpsi, TombolOpsi, Ikon, useSisaWaktu } from '../components/Opsi.jsx'
import { PilihJanggal, SusunUrutan, urutanBenar, tandaEfek } from '../components/MiniGames.jsx'

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
      const { data } = await supabase.from('questions').select('id, game, prompt, payload, durasi_detik, refleksi').eq('id', id).single()
      setQ(data)
      setDiterima(Date.now()) // timer tampilan; batas waktu sebenarnya dijaga server
      if (saya) {
        const { data: a } = await supabase.from('answers').select('jawaban, benar, poin').eq('question_id', id).eq('player_id', saya.id).maybeSingle()
        if (a) setJawab({ ...a.jawaban, benar: a.benar, poin: a.poin })
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

  const sisa = useSisaWaktu(sesi?.status === 'running' ? diterima : null, q ? durasiEfektif(q, sesi) : 20)

  async function kirimJawaban(jawaban) {
    if (jawab || kirim) return
    setKirim(true); setErr('')
    try {
      const { data, error } = await supabase.rpc('submit_answer', { p_session: sid, p_question: q.id, p_jawaban: jawaban })
      if (error) throw error
      const r = data[0]
      setJawab({ ...jawaban, benar: r.benar, poin: r.poin })
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
        {sesi.game !== 'dilema' && (
          <div className="kartu-besar" style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
            <span className="label">Skor akhir</span>
            <span style={{ fontSize: 40, fontWeight: 800 }}>{angka(saya.skor)}</span>
            {peringkat && <span className="muted" style={{ fontWeight: 700 }}>Posisi {peringkat.posisi} dari {peringkat.total}</span>}
          </div>
        )}
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
        <p className="muted" style={{ fontWeight: 700 }}>Lihat namamu di layar depan. {NAMA_SESI[sesi.game]} mulai saat fasilitator siap.</p>
        {footer}
      </Layar>
    )
  }

  // Akhir cerita Dilema Bercabang: tidak ada pilihan lagi
  if (q.game === 'dilema' && q.payload?.akhir) {
    return (
      <Layar tengah>
        <img src="/bening-mikir.svg" alt="" width="150" height="150" />
        <span className="label">Akhir cerita · {q.payload.judul}</span>
        <h1 style={{ fontSize: 22, lineHeight: 1.4, fontWeight: 800 }}>{q.prompt}</h1>
        {q.refleksi && (
          <div className="kartu" style={{ width: '100%', textAlign: 'left' }}>
            <span className="label" style={{ color: 'var(--toska-strong)' }}>Diskusikan</span>
            <p style={{ marginTop: 6, fontSize: 17, lineHeight: 1.45, fontWeight: 700 }}>{q.refleksi}</p>
          </div>
        )}
        {footer}
      </Layar>
    )
  }

  if (sesi.status === 'reveal') return <Layar tengah><HasilPeserta q={q} jawab={jawab} reveal={reveal} peringkat={peringkat} /></Layar>

  // status running
  if (jawab || sisa === 0) {
    return (
      <Layar tengah>
        <img src="/bening-mikir.svg" alt="" width="150" height="150" />
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{jawab ? (q.game === 'dilema' ? 'Pilihanmu tercatat!' : 'Jawaban terkirim!') : 'Waktu habis'}</h1>
        <p className="muted" style={{ fontWeight: 700 }}>{q.game === 'dilema' ? 'Tunggu hasil suara terbanyak di layar depan.' : 'Tunggu pembahasan di layar depan.'}</p>
        {footer}
      </Layar>
    )
  }

  let isian
  if (q.game === 'detektif_spj') isian = <PilihJanggal q={q} sibuk={kirim} onKirim={kirimJawaban} />
  else if (q.game === 'susun_alur') isian = <SusunUrutan q={q} sibuk={kirim} onKirim={kirimJawaban} />
  else {
    isian = (
      <div className="opsi-grid" style={{ flex: 1, alignContent: 'start' }}>
        {daftarOpsi(q).map((o) => <TombolOpsi key={o.key} o={o} disabled={kirim} onClick={() => kirimJawaban({ pilihan: o.key })} />)}
      </div>
    )
  }

  return (
    <Layar>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span className="label">{GAMES[q.game]?.nama}</span>
        <span className="chip kuning"><Ikon nama="jam" size={16} />{sisa} dtk</span>
      </header>
      <div className="kartu">
        {q.game === 'dilema' && <span className="label" style={{ display: 'block', marginBottom: 6 }}>{q.payload?.judul}</span>}
        <p style={{ fontSize: q.game === 'dilema' ? 18 : 20, lineHeight: 1.4, fontWeight: 700 }}>{q.prompt}</p>
      </div>
      {isian}
      {err && <p className="error" role="alert">{err}</p>}
      {footer}
    </Layar>
  )
}

function HasilPeserta({ q, jawab, reveal, peringkat }) {
  const kunci = reveal?.kunci
  const posisi = peringkat && <p style={{ fontWeight: 700 }}>Posisi {peringkat.posisi} dari {peringkat.total}</p>
  const pembahasan = reveal?.pembahasan && (
    <div className="kartu" style={{ width: '100%', textAlign: 'left' }}>
      <p style={{ fontSize: 16, lineHeight: 1.5, fontWeight: 700 }}>{reveal.pembahasan}</p>
      {reveal.dasar_hukum && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{reveal.dasar_hukum}</p>}
    </div>
  )

  if (q.game === 'dilema') {
    const o = daftarOpsi(q).find((x) => x.key === jawab?.pilihan)
    const efek = o && kunci ? kunci[o.key] : null
    return (
      <>
        <img src={efek > 0 ? '/bening-senang.svg' : '/bening-mikir.svg'} alt="" width="150" height="150" />
        {o ? (
          <>
            <span className="label">Pilihanmu</span>
            <h1 style={{ fontSize: 22, lineHeight: 1.35, fontWeight: 800 }}>{o.huruf}. {o.label}</h1>
            {efek != null && <span className={`chip ${efek > 0 ? 'benar' : 'salah'}`} style={{ fontSize: 18 }}>Indeks Integritas {tandaEfek(efek)}</span>}
          </>
        ) : <h1 style={{ fontSize: 22, fontWeight: 800 }}>Kamu tidak memilih di babak ini.</h1>}
        <p className="muted" style={{ fontWeight: 700 }}>Suara terbanyak menentukan lanjutan cerita. Lihat layar depan.</p>
      </>
    )
  }

  const benar = !!jawab?.benar
  const sebagian = !benar && (jawab?.poin || 0) > 0
  let judul = benar ? 'Mantap, jawabanmu tepat!' : sebagian ? 'Sebagian kejanggalan ketemu!' : 'Tidak apa-apa, ini kesempatan belajar.'
  if (benar && q.game === 'detektif_spj') judul = 'Semua kejanggalan ketemu!'
  if (benar && q.game === 'susun_alur') judul = 'Urutanmu tepat!'

  let detail = null
  if (q.game === 'detektif_spj' && Array.isArray(kunci)) {
    const dipilih = jawab?.pilihan || []
    detail = (
      <div className="kartu" style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="label">Bagian yang janggal</span>
        {(q.payload?.elemen || []).filter((e) => kunci.includes(e.no)).map((e) => (
          <p key={e.no} style={{ fontWeight: 700, fontSize: 15, display: 'flex', gap: 8 }}>
            <span style={{ color: dipilih.includes(e.no) ? 'var(--toska-strong)' : 'var(--salah)', flex: 'none' }}><Ikon nama={dipilih.includes(e.no) ? 'benar' : 'salah'} size={18} /></span>
            <span>{e.no}. {e.teks}</span>
          </p>
        ))}
      </div>
    )
  } else if (q.game === 'susun_alur' && Array.isArray(kunci)) {
    detail = (
      <div className="kartu" style={{ width: '100%', textAlign: 'left' }}>
        <span className="label">Urutan yang benar</span>
        <ol style={{ margin: '8px 0 0', paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 15 }}>
          {urutanBenar(q, kunci).map((t) => <li key={t}>{t}</li>)}
        </ol>
      </div>
    )
  } else if (!benar && kunci != null) {
    const o = daftarOpsi(q).find((x) => JSON.stringify(x.key) === JSON.stringify(kunci))
    if (o) detail = (
      <div className="kartu" style={{ width: '100%', textAlign: 'left' }}>
        <span className="label">Jawaban yang benar</span>
        <p style={{ fontSize: 18, fontWeight: 800, marginTop: 6 }}>{o.huruf ? `${o.huruf} · ` : ''}{o.label}</p>
      </div>
    )
  }

  return (
    <>
      <span className={`chip ${benar || sebagian ? 'benar' : 'salah'}`}>
        <Ikon nama={benar || sebagian ? 'benar' : 'salah'} size={18} />{benar ? 'Benar' : sebagian ? 'Sebagian benar' : jawab ? 'Belum tepat' : 'Tidak menjawab'}
      </span>
      <img src={benar || sebagian ? '/bening-senang.svg' : '/bening-kaget.svg'} alt="" width="140" height="140" />
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>{judul}</h1>
      {(jawab?.poin || 0) > 0 && <div className="kartu-besar" style={{ padding: '12px 28px', border: '1px solid var(--line)' }}><span style={{ fontSize: 34, fontWeight: 800 }}>+{angka(jawab.poin)}</span></div>}
      {detail}
      {pembahasan}
      {posisi}
    </>
  )
}

function Layar({ children, tengah }) {
  return (
    <div className="halaman">
      <main className="hp" style={tengah ? { alignItems: 'center', textAlign: 'center', justifyContent: 'center', paddingTop: 8 } : { paddingTop: 8 }}>{children}</main>
    </div>
  )
}
