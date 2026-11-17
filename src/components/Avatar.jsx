// Avatar fasilitator: ikon datar orisinal, tanpa foto.
// p1–p5 = laki-laki, w1–w5 = perempuan. Kode disimpan di facilitator_profiles.avatar.

const KULIT = ['#F1C9A5', '#E0AC80', '#C68A5E', '#8D5A3B']

function Wajah({ kulit, kacamata }) {
  return (
    <>
      <ellipse cx="32" cy="29" rx="10.5" ry="11.5" fill={kulit} />
      <circle cx="28" cy="29" r="1.4" fill="#14284B" />
      <circle cx="36" cy="29" r="1.4" fill="#14284B" />
      <path d="M28.5 34 Q32 37 35.5 34" fill="none" stroke="#14284B" strokeWidth="1.6" strokeLinecap="round" />
      {kacamata && (
        <g fill="none" stroke="#14284B" strokeWidth="1.4">
          <circle cx="28" cy="29" r="3.6" />
          <circle cx="36" cy="29" r="3.6" />
          <path d="M31.6 29 H32.4" />
        </g>
      )}
    </>
  )
}

function Badan({ baju, kulit }) {
  return (
    <>
      <rect x="28.5" y="37" width="7" height="7" fill={kulit} />
      <path d="M12 64 C12 49 21 43 32 43 C43 43 52 49 52 64 Z" fill={baju} />
    </>
  )
}

const DAFTAR = {
  p1: { label: 'Laki-laki, rambut pendek', bg: '#2CC4B0', isi: (
    <>
      <Badan baju="#14284B" kulit={KULIT[0]} />
      <Wajah kulit={KULIT[0]} />
      <path d="M21.5 27 C21 16 43 15 42.5 27 C40 21 26 20 21.5 27 Z" fill="#2B2B2B" />
    </>
  ) },
  p2: { label: 'Laki-laki, berpeci', bg: '#FFC531', isi: (
    <>
      <Badan baju="#0B7F73" kulit={KULIT[1]} />
      <Wajah kulit={KULIT[1]} />
      <path d="M21 23 L22 14 H42 L43 23 Z" fill="#1E1E1E" />
    </>
  ) },
  p3: { label: 'Laki-laki, berkacamata', bg: '#7FA2F0', isi: (
    <>
      <Badan baju="#C2383A" kulit={KULIT[2]} />
      <Wajah kulit={KULIT[2]} kacamata />
      <path d="M21.5 28 C20 15 44 14 42.5 28 L41 23 C36 19 28 19 23 23 Z" fill="#2B2B2B" />
    </>
  ) },
  p4: { label: 'Laki-laki, berjanggut', bg: '#F07A7A', isi: (
    <>
      <Badan baju="#14284B" kulit={KULIT[3]} />
      <Wajah kulit={KULIT[3]} />
      <path d="M21.5 30 C22 39 26 41 32 41 C38 41 42 39 42.5 30 C41 35 37 36 32 36 C27 36 23 35 21.5 30 Z" fill="#1E1E1E" />
      <path d="M28.5 34 Q32 37 35.5 34" fill="none" stroke="#F1C9A5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M21.5 27 C21 16 43 15 42.5 27 C40 21 26 20 21.5 27 Z" fill="#1E1E1E" />
    </>
  ) },
  p5: { label: 'Laki-laki, rambut beruban', bg: '#A9B6C9', isi: (
    <>
      <Badan baju="#2F5FD0" kulit={KULIT[1]} />
      <Wajah kulit={KULIT[1]} kacamata />
      <path d="M21.5 27 C21 16 43 15 42.5 27 C40 21 26 20 21.5 27 Z" fill="#E4E7EC" />
    </>
  ) },
  w1: { label: 'Perempuan, berhijab toska', bg: '#14284B', isi: (
    <>
      <path d="M14 64 C14 50 18 44 22 42 H42 C46 44 50 50 50 64 Z" fill="#F6F8FB" />
      <path d="M17 33 C16 14 48 14 47 33 L49 49 C42 55 22 55 15 49 Z" fill="#2CC4B0" />
      <Wajah kulit={KULIT[0]} />
      <path d="M21.5 27 C23 16 41 16 42.5 27 C39 21 25 21 21.5 27 Z" fill="#2CC4B0" />
    </>
  ) },
  w2: { label: 'Perempuan, berhijab merah muda', bg: '#2CC4B0', isi: (
    <>
      <path d="M14 64 C14 50 18 44 22 42 H42 C46 44 50 50 50 64 Z" fill="#14284B" />
      <path d="M17 33 C16 14 48 14 47 33 L49 49 C42 55 22 55 15 49 Z" fill="#F07A7A" />
      <Wajah kulit={KULIT[1]} kacamata />
      <path d="M21.5 27 C23 16 41 16 42.5 27 C39 21 25 21 21.5 27 Z" fill="#F07A7A" />
    </>
  ) },
  w3: { label: 'Perempuan, berhijab navy', bg: '#FFC531', isi: (
    <>
      <path d="M14 64 C14 50 18 44 22 42 H42 C46 44 50 50 50 64 Z" fill="#0B7F73" />
      <path d="M17 33 C16 14 48 14 47 33 L49 49 C42 55 22 55 15 49 Z" fill="#14284B" />
      <Wajah kulit={KULIT[2]} />
      <path d="M21.5 27 C23 16 41 16 42.5 27 C39 21 25 21 21.5 27 Z" fill="#14284B" />
    </>
  ) },
  w4: { label: 'Perempuan, rambut panjang', bg: '#7FA2F0', isi: (
    <>
      <path d="M19 28 C19 13 45 13 45 28 L47 48 H17 Z" fill="#3A2A20" />
      <Badan baju="#FFC531" kulit={KULIT[1]} />
      <Wajah kulit={KULIT[1]} />
      <path d="M21.5 28 C21 16 43 15 42.5 28 C38 22 30 20 21.5 28 Z" fill="#3A2A20" />
    </>
  ) },
  w5: { label: 'Perempuan, rambut dicepol, berkacamata', bg: '#F07A7A', isi: (
    <>
      <circle cx="32" cy="13" r="6" fill="#1E1E1E" />
      <Badan baju="#14284B" kulit={KULIT[3]} />
      <Wajah kulit={KULIT[3]} kacamata />
      <path d="M21.5 28 C21 16 43 15 42.5 28 C40 21 26 20 21.5 28 Z" fill="#1E1E1E" />
    </>
  ) },
}

export const AVATAR = ['p1', 'p2', 'p3', 'p4', 'p5', 'w1', 'w2', 'w3', 'w4', 'w5']
export const labelAvatar = (id) => (DAFTAR[id] || DAFTAR.p1).label

export function Avatar({ id = 'p1', size = 48, judul }) {
  const a = DAFTAR[id] || DAFTAR.p1
  return (
    <svg viewBox="10 8 44 44" width={size} height={size} role={judul ? 'img' : undefined} aria-label={judul || undefined} aria-hidden={judul ? undefined : true} style={{ display: 'block', flexShrink: 0 }}>
      <defs><clipPath id={`av-${id}`}><circle cx="32" cy="30" r="22" /></clipPath></defs>
      <g clipPath={`url(#av-${id})`}>
        <rect width="64" height="64" fill={a.bg} />
        {a.isi}
      </g>
    </svg>
  )
}
