import { useEffect, useState } from 'react'
import Gabung from './pages/Gabung.jsx'
import Main from './pages/Main.jsx'
import HostBeranda from './pages/HostBeranda.jsx'
import HostSesi from './pages/HostSesi.jsx'

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

  const tema = path.startsWith('/host') ? 'dark' : 'light'
  useEffect(() => {
    document.documentElement.dataset.theme = tema
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', tema === 'dark' ? '#0E1A30' : '#F6F8FB')
  }, [tema])

  let m
  if ((m = path.match(/^\/main\/([0-9a-f-]{36})$/))) return <Main sid={m[1]} />
  if ((m = path.match(/^\/host\/([0-9a-f-]{36})$/))) return <HostSesi sid={m[1]} />
  if (path.startsWith('/host')) return <HostBeranda profil={path === '/host/profil'} />
  const pin = new URLSearchParams(window.location.search).get('pin') || ''
  return <Gabung pinAwal={pin} />
}
