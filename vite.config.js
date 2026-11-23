import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ID container GTM (publik, tampil di sumber halaman). Bisa ditimpa lewat env VITE_GTM_ID.
process.env.VITE_GTM_ID ||= 'GTM-KR9V8VNN'

export default defineConfig({ plugins: [react()] })
