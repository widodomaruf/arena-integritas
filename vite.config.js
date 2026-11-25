import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ID container GTM (publik, tampil di sumber halaman). Bisa ditimpa lewat env VITE_GTM_ID.
process.env.VITE_GTM_ID ||= 'GTM-KR9V8VNN'
// Site Key Cloudflare Turnstile (publik). Bisa ditimpa lewat env VITE_TURNSTILE_SITE_KEY.
process.env.VITE_TURNSTILE_SITE_KEY ||= '0x4AAAAAAGR8yGZKnFylB_w-'

export default defineConfig({ plugins: [react()] })
