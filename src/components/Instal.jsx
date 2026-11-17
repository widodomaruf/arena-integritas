import { useEffect, useState } from 'react'

// Chrome/Edge di Android & desktop mengirim event ini sekali, sering sebelum React selesai dimuat.
// Simpan sejak modul dimuat supaya tombol tetap bisa dipakai.
let tundaan = null
const pendengar = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); tundaan = e; pendengar.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { tundaan = null; pendengar.forEach((f) => f()) })
}

const sudahTerpasang = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const iOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent)

export function TombolInstal({ gelap }) {
  const [, segarkan] = useState(0)
  const [petunjuk, setPetunjuk] = useState(false)
  useEffect(() => {
    const f = () => segarkan((n) => n + 1)
    pendengar.add(f)
    return () => pendengar.delete(f)
  }, [])

  if (sudahTerpasang()) return null
  if (tundaan) {
    return (
      <button type="button" className="btn sekunder kecil" onClick={async () => {
        const e = tundaan
        e.prompt()
        await e.userChoice.catch(() => {})
        tundaan = null
        segarkan((n) => n + 1)
      }}>
        Instal aplikasi
      </button>
    )
  }
  if (iOS()) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <button type="button" className="btn sekunder kecil" aria-expanded={petunjuk} onClick={() => setPetunjuk(!petunjuk)}>
          Instal aplikasi
        </button>
        {petunjuk && (
          <p className="muted" style={{ fontSize: 14, textAlign: 'center', maxWidth: 320, color: gelap ? undefined : 'var(--ink)' }}>
            Ketuk tombol <b>Bagikan</b> di Safari, lalu pilih <b>Tambah ke Layar Utama</b>.
          </p>
        )}
      </div>
    )
  }
  return null
}
