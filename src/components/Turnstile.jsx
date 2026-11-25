import { useCallback, useEffect, useRef, useState } from 'react'

// Site Key bersifat publik. Secret Key hanya ada di dashboard Supabase (Attack Protection).
export const KUNCI_TURNSTILE = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

let janjiSkrip
function muatSkrip() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!janjiSkrip) {
    janjiSkrip = new Promise((ok, gagal) => {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = () => ok(window.turnstile)
      s.onerror = () => { janjiSkrip = null; gagal(new Error('Skrip Turnstile gagal dimuat')) }
      document.head.appendChild(s)
    })
  }
  return janjiSkrip
}

// Pakai: const t = useTurnstile(); taruh {t.kotak} di form; kirim t.token ke Supabase; panggil t.reset() setelah dipakai (token sekali pakai).
export function useTurnstile() {
  const [token, setToken] = useState('')
  const [gagal, setGagal] = useState(false)
  const wadah = useRef(null)
  const idWidget = useRef(null)

  useEffect(() => {
    if (!KUNCI_TURNSTILE) return undefined
    let batal = false
    muatSkrip().then((t) => {
      if (batal || !wadah.current) return
      idWidget.current = t.render(wadah.current, {
        sitekey: KUNCI_TURNSTILE,
        theme: 'auto',
        language: 'id',
        callback: (tk) => { setToken(tk); setGagal(false) },
        'expired-callback': () => setToken(''),
        'error-callback': () => { setToken(''); setGagal(true) },
      })
    }).catch(() => setGagal(true))
    return () => {
      batal = true
      if (idWidget.current != null && window.turnstile) window.turnstile.remove(idWidget.current)
      idWidget.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setToken('')
    if (idWidget.current != null && window.turnstile) window.turnstile.reset(idWidget.current)
  }, [])

  const kotak = KUNCI_TURNSTILE ? <div ref={wadah} aria-label="Verifikasi keamanan" /> : null
  return { token, reset, kotak, aktif: !!KUNCI_TURNSTILE, gagal }
}

export const PESAN_VERIFIKASI_BELUM = 'Verifikasi keamanan masih berjalan. Tunggu sebentar sampai selesai, lalu coba lagi.'
