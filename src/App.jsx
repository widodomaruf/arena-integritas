import { useEffect, useState } from 'react'
import { AnimatePresence, LazyMotion, MotionConfig } from 'motion/react'
import * as m from 'motion/react-m'
import { useLenis } from './lib/animasi.jsx'
import Gabung from './pages/Gabung.jsx'
import Main from './pages/Main.jsx'
import HostBeranda from './pages/HostBeranda.jsx'
import HostSesi from './pages/HostSesi.jsx'
import LaporanSesi from './pages/LaporanSesi.jsx'
import { supabase } from './supabase.js'

// Dibaca sebelum Supabase menghapus #hash dari URL.
const DARI_TAUTAN_PEMULIHAN = /type=recovery/.test(window.location.hash)

export function pindah(path) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const f = () => setPath(window.location.pathname)
    window.addEventListener('popstate', f)
    return () => window.removeEventListener('popstate', f)
  }, [])

  // Tautan ganti kata sandi dari email bisa mendarat di halaman mana pun; arahkan ke formulir kata sandi baru.
  useEffect(() => {
    if (DARI_TAUTAN_PEMULIHAN) pindah('/host/atur-sandi')
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === 'PASSWORD_RECOVERY') pindah('/host/atur-sandi') })
    return () => sub.subscription.unsubscribe()
  }, [])

  const tema = path.startsWith('/host') ? 'dark' : 'light'
  useEffect(() => {
    document.documentElement.dataset.theme = tema
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', tema === 'dark' ? '#0E1A30' : '#F6F8FB')
  }, [tema])

  // Layar permainan memakai scroll bawaan (ringan di HP murah); halaman lain pakai Lenis.
  const layarMain = /^\/(main|host)\/[0-9a-f-]{36}$/.test(path)
  useLenis(!layarMain, path)

  let mm, el
  if ((mm = path.match(/^\/main\/([0-9a-f-]{36})$/))) el = <Main sid={mm[1]} />
  else if ((mm = path.match(/^\/host\/([0-9a-f-]{36})$/))) el = <HostSesi sid={mm[1]} />
  else if ((mm = path.match(/^\/host\/riwayat\/([0-9a-f-]{36})$/))) el = <LaporanSesi sid={mm[1]} />
  else if (path.startsWith('/host')) el = <HostBeranda profil={path === '/host/profil'} halaman={path} />
  else el = <Gabung pinAwal={new URLSearchParams(window.location.search).get('pin') || ''} />

  return (
    <LazyMotion features={() => import('./lib/fitur-motion.js').then((r) => r.default)} strict>
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <m.div key={path} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}>{el}</m.div>
      </AnimatePresence>
    </MotionConfig>
    </LazyMotion>
  )
}
