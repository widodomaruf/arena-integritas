# Arnitas (Arena Integritas)

Game edukasi antikorupsi untuk fasilitator: kuis live dan mini games (Kuis Live, Terima atau Tolak, Tebak Delik).
*Seru mainnya, jujur sikapnya.*

- `/` — peserta gabung dengan PIN (tanpa akun, login anonim Supabase)
- `/host` — fasilitator masuk (email + kata sandi), buat sesi, kendalikan permainan di layar proyektor

Stack: Vite + React, Supabase (Postgres, Auth, Realtime), deploy di Vercel.
Penilaian & kunci jawaban dijaga di database (RLS + fungsi `submit_answer`, `get_reveal`).

```bash
npm install
npm run dev
```

Env opsional: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
