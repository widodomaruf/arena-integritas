import { useEffect, useMemo, useState } from 'react'
import { supabase, GAMES, NAMA_SESI, SASARAN, TOPIK, BANK_V2, GAME_PILIHAN, estimasiSesi, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'

const acakUrut = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1])
const baca = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const simpan = (k, v) => { try { localStorage.setItem(k, v) } catch {} }

function Chip({ aktif, onClick, children, peran = 'radio' }) {
  return (
    <button type="button" role={peran} aria-checked={aktif} onClick={onClick}
      style={{ minHeight: 44, padding: '0 18px', borderRadius: 999, border: `2px solid ${aktif ? 'var(--toska)' : 'var(--line)'}`,
        background: aktif ? 'var(--toska)' : 'var(--surface)', color: aktif ? 'var(--on-accent, #0E1A30)' : 'var(--ink)', font: 'inherit', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
      {children}
    </button>
  )
}

function Langkah({ no, judul, children }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span aria-hidden style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--toska)', color: '#0E1A30', display: 'grid', placeItems: 'center', fontSize: 16 }}>{no}</span>
        {judul}
      </h2>
      {children}
    </section>
  )
}

export default function BuatSesi({ user }) {
  const [bank, setBank] = useState(null)
  const [soal, setSoal] = useState([])
  const [paket, setPaket] = useState([])
  const [durasi, setDurasi] = useState(() => baca('ai_durasi', '20'))
  const [durasiLain, setDurasiLain] = useState(() => Number(baca('ai_durasi_lain', '25')) || 25)
  const [sasaran, setSasaran] = useState(() => baca('ai_sasaran', ''))
  const [mode, setMode] = useState(() => baca('ai_mode_buat', 'paket'))
  const [pilihPaket, setPilihPaket] = useState('')
  const [topik, setTopik] = useState([])
  const [game, setGame] = useState('')
  const [skenario, setSkenario] = useState('')
  const [n, setN] = useState(10)
  const [acak, setAcak] = useState(true)
  const [err, setErr] = useState('')
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    ;(async () => {
      let { data: b } = await supabase.from('question_banks').select('id, judul').eq('judul', BANK_V2).maybeSingle()
      if (!b) ({ data: b } = await supabase.from('question_banks').select('id, judul').order('created_at').limit(1).maybeSingle())
      setBank(b)
      if (b) {
        const { data: qs, error } = await supabase.from('questions')
          .select('id, game, topik, sasaran, payload, urutan, durasi_detik').eq('bank_id', b.id).eq('status', 'terverifikasi').order('urutan')
        if (error) setErr(pesanError(error))
        setSoal(qs || [])
      }
      const { data: pk } = await supabase.from('paket_sesi').select('*').order('urutan')
      setPaket(pk || [])
    })()
  }, [user.id])

  const untukSasaran = useMemo(() => soal.filter((q) => !sasaran || (q.sasaran || []).includes(sasaran)), [soal, sasaran])
  const cerita = useMemo(() => untukSasaran.filter((q) => q.game === 'dilema' && q.payload?.node === 'N1')
    .map((q) => ({ id: q.payload.skenario_id, judul: q.payload.judul, topik: q.topik })), [untukSasaran])
  const sesuaiTopik = (q) => !topik.length || topik.includes(q.topik)
  const hitungTopik = useMemo(() => {
    const c = {}
    untukSasaran.forEach((q) => { if (q.game !== 'dilema' || q.payload?.node === 'N1') c[q.topik] = (c[q.topik] || 0) + 1 })
    return c
  }, [untukSasaran])
  const hitungGame = useMemo(() => {
    const c = {}
    untukSasaran.filter(sesuaiTopik).forEach((q) => { if (q.game !== 'dilema') c[q.game] = (c[q.game] || 0) + 1 })
    c.dilema = cerita.filter(sesuaiTopik).length
    return c
  }, [untukSasaran, cerita, topik])
  const detikSoal = durasi === 'lain' ? Math.min(30, Math.max(5, Math.round(durasiLain) || 20)) : Number(durasi)
  const gantiDurasi = (d) => { setDurasi(d); simpan('ai_durasi', d) }
  const gantiLain = (v) => { const n = Math.min(30, Math.max(0, Math.round(Number(v) || 0))); setDurasiLain(n); simpan('ai_durasi_lain', String(n)) }
  const paketSasaran = paket.filter((p) => p.sasaran === sasaran)
  const gameTersedia = Object.keys(GAMES).filter((k) => hitungGame[k] > 0)

  useEffect(() => { if (game && !gameTersedia.includes(game)) setGame('') }, [gameTersedia.join(), game])
  useEffect(() => { setPilihPaket('') }, [sasaran])

  function gantiSasaran(id) { setSasaran(id); simpan('ai_sasaran', id); setTopik([]); setGame('') }
  function gantiMode(m) { setMode(m); simpan('ai_mode_buat', m) }
  const toggleTopik = (t) => setTopik((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]))

  function susunPaket(p, acakPilih = true) {
    const dipakai = new Set()
    const ids = []
    for (const l of p.langkah) {
      const saring = untukSasaran.filter((q) => q.game === l.game && q.game !== 'dilema' && !dipakai.has(q.id)
        && (!l.topik?.length || l.topik.includes(q.topik)))
      const kolam = acakPilih ? acakUrut(saring) : saring
      kolam.slice(0, l.jumlah).forEach((q) => { dipakai.add(q.id); ids.push(q.id) })
    }
    return ids
  }

  const petaSoal = useMemo(() => new Map(soal.map((q) => [q.id, q])), [soal])
  const hitungEstimasi = (ids) => estimasiSesi(ids.map((id) => petaSoal.get(id)).filter(Boolean), detikSoal)
  const idsAtur = useMemo(() => {
    if (!game) return []
    if (game === 'dilema') return skenario ? soal.filter((q) => q.game === 'dilema' && q.payload?.skenario_id === skenario).map((q) => q.id) : []
    return untukSasaran.filter((q) => q.game === game && sesuaiTopik(q)).slice(0, n).map((q) => q.id)
  }, [game, skenario, n, topik, untukSasaran, soal])
  const paketTerpilih = paketSasaran.find((x) => x.id === pilihPaket)
  const estimasiPilihan = mode === 'paket' ? (paketTerpilih ? hitungEstimasi(susunPaket(paketTerpilih, false)) : null) : (idsAtur.length ? hitungEstimasi(idsAtur) : null)

  async function buat() {
    setErr('')
    let gameSesi, ids, judulPaket = ''
    if (mode === 'paket') {
      const p = paketSasaran.find((x) => x.id === pilihPaket)
      if (!p) { setErr('Pilih salah satu paket dulu, atau pilih "Atur sendiri".'); return }
      ids = susunPaket(p)
      const games = [...new Set(p.langkah.map((l) => l.game))]
      gameSesi = games.length === 1 ? games[0] : 'campuran'
      judulPaket = p.judul
    } else {
      if (!game) { setErr('Pilih satu permainan dulu.'); return }
      gameSesi = game
      if (game === 'dilema') {
        if (!skenario) { setErr('Pilih ceritanya dulu.'); return }
        ids = soal.filter((q) => q.game === 'dilema' && q.payload?.skenario_id === skenario).map((q) => q.id)
      } else {
        ids = untukSasaran.filter((q) => q.game === game && sesuaiTopik(q)).map((q) => q.id)
        if (acak) ids = acakUrut(ids)
        ids = ids.slice(0, n)
      }
    }
    if (!ids.length) { setErr('Belum ada soal untuk pilihan ini. Coba sasaran atau topik lain.'); return }
    setSibuk(true)
    try {
      const { data, error } = await supabase.rpc('create_session', { p_bank: bank.id, p_game: gameSesi })
      if (error) throw error
      const judulSesi = judulPaket || (gameSesi === 'dilema' ? cerita.find((c) => c.id === skenario)?.judul : '') || NAMA_SESI[gameSesi]
      const { error: e2 } = await supabase.from('sessions').update({ durasi_detik: detikSoal, judul: judulSesi, soal_ids: ids }).eq('id', data.id)
      if (e2) throw e2
      simpan(`ai_sesi_${data.id}`, JSON.stringify(ids))
      if (judulPaket) simpan(`ai_paket_${data.id}`, judulPaket)
      pindah(`/host/${data.id}`)
    } catch (e) { setErr(pesanError(e)) } finally { setSibuk(false) }
  }

  const labelEstimasi = (e) => `${e.soal} soal · ± ${e.menit} menit`
  const ringkasLangkah = (p) => p.langkah.map((l) => `${GAMES[l.game]?.nama} ${l.jumlah}`).join(' · ')

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 32, maxWidth: 1040, width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ fontSize: 36, fontWeight: 800 }}>Buat sesi baru</h1>
        <p className="muted" style={{ fontWeight: 700 }}>{bank ? `${bank.judul} · ${soal.length} soal terverifikasi` : 'Memuat bank soal…'}</p>
      </div>

      <Langkah no="1" judul="Siapa pesertanya?">
        <div role="radiogroup" aria-label="Sasaran peserta" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {SASARAN.map((s) => <Chip key={s.id} aktif={sasaran === s.id} onClick={() => gantiSasaran(s.id)}>{s.nama}</Chip>)}
        </div>
        {sasaran && <p className="muted" style={{ fontSize: 15 }}>{SASARAN.find((s) => s.id === sasaran)?.ket} · {untukSasaran.filter((q) => q.game !== 'dilema').length} soal dan {cerita.length} cerita dilema tersedia</p>}
      </Langkah>

      {sasaran && (
        <Langkah no="2" judul="Pakai paket siap pakai atau atur sendiri?">
          <div role="radiogroup" aria-label="Cara menyusun sesi" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Chip aktif={mode === 'paket'} onClick={() => gantiMode('paket')}>Paket siap pakai</Chip>
            <Chip aktif={mode === 'atur'} onClick={() => gantiMode('atur')}>Atur sendiri</Chip>
          </div>

          {mode === 'paket' && (paketSasaran.length ? (
            <div role="radiogroup" aria-label="Paket sesi" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {paketSasaran.map((p) => (
                <button key={p.id} type="button" role="radio" aria-checked={pilihPaket === p.id} onClick={() => setPilihPaket(p.id)} className="kartu-besar"
                  style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', border: `3px solid ${pilihPaket === p.id ? 'var(--toska)' : 'var(--line)'}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="label">{labelEstimasi(hitungEstimasi(susunPaket(p, false)))}</span>
                  <span style={{ fontSize: 20, fontWeight: 800 }}>{p.judul}</span>
                  {p.deskripsi && <span className="muted" style={{ fontWeight: 600, fontSize: 15 }}>{p.deskripsi}</span>}
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{ringkasLangkah(p)}</span>
                </button>
              ))}
            </div>
          ) : <p className="muted">Belum ada paket untuk sasaran ini. Pilih "Atur sendiri".</p>)}

          {mode === 'atur' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="label">Topik materi (boleh lebih dari satu, kosongkan untuk semua)</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Object.entries(TOPIK).filter(([k]) => hitungTopik[k]).map(([k, nama]) => (
                    <Chip key={k} peran="checkbox" aktif={topik.includes(k)} onClick={() => toggleTopik(k)}>{nama} ({hitungTopik[k]})</Chip>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p className="label">Permainan</p>
                {gameTersedia.length ? (
                  <div role="radiogroup" aria-label="Permainan" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    {gameTersedia.map((k) => (
                      <button key={k} type="button" role="radio" aria-checked={game === k} onClick={() => setGame(k)} className="kartu-besar"
                        style={{ textAlign: 'left', cursor: 'pointer', color: 'var(--ink)', border: `3px solid ${game === k ? 'var(--toska)' : 'var(--line)'}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 20, fontWeight: 800 }}>{GAMES[k].nama}</span>
                        <span className="muted" style={{ fontWeight: 600, fontSize: 15 }}>{GAMES[k].ket}</span>
                        <span className="label" style={{ marginTop: 6 }}>{k === 'dilema' ? `${hitungGame[k]} cerita` : `${hitungGame[k]} soal`}</span>
                      </button>
                    ))}
                  </div>
                ) : <p className="muted">Belum ada soal untuk topik ini. Coba topik lain.</p>}
              </div>
              {game && (
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                  {game === 'dilema' ? (
                    <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>CERITA
                      <select className="input" style={{ width: 340, maxWidth: '100%', height: 48, fontSize: 18 }} value={skenario} onChange={(e) => setSkenario(e.target.value)}>
                        <option value="">Pilih cerita</option>
                        {cerita.filter(sesuaiTopik).map((c) => <option key={c.id} value={c.id}>{c.judul}</option>)}
                      </select>
                    </label>
                  ) : (
                    <>
                      <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>JUMLAH SOAL
                        <select className="input" style={{ width: 120, height: 48, fontSize: 18 }} value={n} onChange={(e) => setN(Number(e.target.value))}>
                          {[3, 5, 10, 15, 20, 99].map((v) => <option key={v} value={v}>{v === 99 ? 'Semua' : v}</option>)}
                        </select>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, minHeight: 44 }}>
                        <input type="checkbox" checked={acak} onChange={(e) => setAcak(e.target.checked)} style={{ width: 22, height: 22 }} /> Acak urutan soal
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </Langkah>
      )}

      {sasaran && (
        <Langkah no="3" judul="Berapa detik waktu tiap soal?">
          <div role="radiogroup" aria-label="Waktu tiap soal" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {['15', '20', '30'].map((d) => <Chip key={d} aktif={durasi === d} onClick={() => gantiDurasi(d)}>{d} detik</Chip>)}
            <Chip aktif={durasi === 'lain'} onClick={() => gantiDurasi('lain')}>Atur sendiri</Chip>
            {durasi === 'lain' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <span className="sr-only">Waktu tiap soal dalam detik</span>
                <input className="input" type="number" inputMode="numeric" min={5} max={30} value={durasiLain || ''} onChange={(e) => gantiLain(e.target.value)}
                  onBlur={() => gantiLain(Math.max(5, durasiLain))} style={{ width: 96, height: 48, fontSize: 18 }} /> detik (5–30)
              </label>
            )}
          </div>
          <p className="muted" style={{ fontSize: 15 }}>Berlaku untuk soal pilihan ganda ({GAME_PILIHAN.map((g) => GAMES[g].nama).join(', ')}). Detektif SPJ, Susun Alur, dan Dilema memakai waktu bawaan karena perlu membaca lebih lama.</p>
        </Langkah>
      )}

      {sasaran && (
        <div className="kartu-besar" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <span className="label">Ringkasan sesi</span>
          {estimasiPilihan ? (
            <>
              <p style={{ fontSize: 22, fontWeight: 800 }}>{estimasiPilihan.soal} {game === 'dilema' && mode === 'atur' ? 'babak' : 'soal'} · ± {estimasiPilihan.menit} menit</p>
              <p className="muted" style={{ fontSize: 15 }}>Perkiraan sudah termasuk pembahasan dan papan skor, belum termasuk diskusi panjang. {estimasiPilihan.menit > 45 ? 'Cukup panjang. Kurangi jumlah soal kalau waktu fasilitasi terbatas.' : ''}</p>
            </>
          ) : <p className="muted">{mode === 'paket' ? 'Pilih paket untuk melihat jumlah soal dan perkiraan waktunya.' : 'Pilih permainan untuk melihat jumlah soal dan perkiraan waktunya.'}</p>}
          {err && <p className="error" role="alert">{err}</p>}
          <button className="btn tekan" disabled={!bank || sibuk} onClick={buat}>{sibuk ? 'Membuat…' : 'Buka lobi'}</button>
        </div>
      )}
    </main>
  )
}
