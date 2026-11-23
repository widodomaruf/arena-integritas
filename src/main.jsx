import React from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.jsx'
import './styles.css'

// Ganti ID sesi di URL dengan :id agar statistik halaman tidak terpecah per sesi.
const rapikan = (e) => ({ ...e, url: e.url.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ':id') })

createRoot(document.getElementById('root')).render(<><App /><Analytics beforeSend={rapikan} /><SpeedInsights /></>)
