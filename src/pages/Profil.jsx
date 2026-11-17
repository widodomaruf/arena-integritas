import { useEffect, useState } from 'react'
import { supabase, pesanError } from '../supabase.js'
import { pindah } from '../App.jsx'
import { Avatar, AVATAR, labelAvatar } from '../components/Avatar.jsx'

export const SKEMA_PAKSI = ['Terampil', 'Pertama', 'Muda', 'Madya', 'Utama']

export async function ambilProfil(uid) {
  const { data } = await supabase.from('facilitator_profiles').select('*').eq('id', uid).maybeSingle()
  return data
}

export default function Profil({ user }) {
  const [f, setF] = useState(null)
  const [galat, setGalat] = useState({})
  const [err, setErr] = useState('')
  const [pesan, setPesan] = useState('')
  const [sibuk, setSibuk] = useState(false)

  useEffect(() => {
    ambilProfil(user.id).then((p) => setF({
      nama: p?.nama || '', avatar: p?.avatar || 'p1', no_reg_paksi: p?.no_reg_paksi || '',
      skema_paksi: p?.skema_paksi || '', instansi: p?.instansi || '',
    })).catch((e) => { setErr(pesanError(e)); setF({ nama: '', avatar: 'p1', no_reg_paksi: '', skema_paksi: '', instansi: '' }) })
  }, [user.id])

  if (!f) return <p className="muted">Memuat profil…</p>

  const ubah = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setGalat((g) => ({ ...g, [k]: '' })); setPesan('') }
  const cekNama = () => !f.nama.trim() && setGalat((g) => ({ ...g, nama: 'Isi nama supaya tampil di ruang fasilitator.' }))

  async function simpan(e) {
    e.preventDefault(); setErr(''); setPesan('')
    if (!f.nama.trim()) { setGalat((g) => ({ ...g, nama: 'Isi nama supaya tampil di ruang fasilitator.' })); return }
    setSibuk(true)
    const { error } = await supabase.from('facilitator_profiles').upsert({
      id: user.id, nama: f.nama.trim(), avatar: f.avatar, no_reg_paksi: f.no_reg_paksi.trim() || null,
      skema_paksi: f.skema_paksi || null, instansi: f.instansi.trim() || null, updated_at: new Date().toISOString(),
    })
    setSibuk(false)
    if (error) setErr(pesanError(error))
    else setPesan('Profil tersimpan.')
  }

  return (
    <form onSubmit={simpan} className="kartu-besar" style={{ width: '100%', maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Profil fasilitator</h1>

      <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <legend className="field" style={{ padding: 0, marginBottom: 12 }}>AVATAR</legend>
        <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
          {AVATAR.map((id) => {
            const pilih = f.avatar === id
            return (
              <label key={id} className="pilih-avatar" title={labelAvatar(id)} style={{ position: 'relative', cursor: 'pointer', borderRadius: 999, padding: 3, display: 'grid', placeItems: 'center',
                boxShadow: pilih ? '0 0 0 3px var(--toska)' : '0 0 0 1px var(--line)' }}>
                <input type="radio" name="avatar" value={id} checked={pilih} onChange={ubah('avatar')}
                  aria-label={labelAvatar(id)} style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }} />
                <Avatar id={id} size={56} />
              </label>
            )
          })}
        </div>
        <p className="muted" style={{ fontSize: 14 }}>Dipilih: {labelAvatar(f.avatar)}</p>
      </fieldset>

      <label className="field">NAMA
        <input className="input" value={f.nama} onChange={ubah('nama')} onBlur={cekNama} maxLength={80} autoComplete="name"
          aria-invalid={!!galat.nama} aria-describedby={galat.nama ? 'galat-nama' : undefined} />
      </label>
      {galat.nama && <p id="galat-nama" className="error">{galat.nama}</p>}

      <label className="field">EMAIL
        <input className="input" value={user.email || ''} readOnly aria-describedby="ket-email" style={{ opacity: .75 }} />
      </label>
      <p id="ket-email" className="muted" style={{ fontSize: 14, marginTop: -12 }}>Email dipakai untuk masuk dan belum bisa diubah.</p>

      <label className="field">NOMOR REGISTRASI PAKSI
        <input className="input" value={f.no_reg_paksi} onChange={ubah('no_reg_paksi')} maxLength={40} placeholder="mis. PAK.915.3.00005 2024" />
      </label>

      <label className="field">SKEMA PAKSI
        <select className="input" value={f.skema_paksi} onChange={ubah('skema_paksi')}>
          <option value="">Pilih skema</option>
          {SKEMA_PAKSI.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label className="field">INSTANSI
        <input className="input" value={f.instansi} onChange={ubah('instansi')} maxLength={120} autoComplete="organization" />
      </label>

      {err && <p className="error" role="alert">{err}</p>}
      {pesan && <p role="status" style={{ fontWeight: 700, color: 'var(--toska)' }}>{pesan}</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button className="btn tekan" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan profil'}</button>
        <button type="button" className="btn sekunder" onClick={() => pindah('/host')}>Kembali ke ruang fasilitator</button>
      </div>
    </form>
  )
}
