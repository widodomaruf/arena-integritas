export const URL_PANDUAN = 'https://drive.google.com/drive/folders/1ojLz1InaK48WYy3_wsSpqyBHiAXo_sYt'

export function Kredit() {
  return (
    <footer className="muted" style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 1.6, padding: '18px 12px 6px' }}>
      <a href={URL_PANDUAN} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--toska-strong)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 8px', fontSize: 14 }}>Buka panduan penggunaan (PDF)</a><br />
      Dikembangkan oleh <b>Muhammad Widodo Ma'ruf</b><br />
      Penyuluh Antikorupsi Utama · <span style={{ whiteSpace: 'nowrap' }}>No. PAK.915.3.00005 2024</span>
    </footer>
  )
}
