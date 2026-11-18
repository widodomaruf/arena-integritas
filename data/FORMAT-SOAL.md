# Format soal Arnitas v2

Tulis SATU file JSON per sasaran: `/home/claude/bank2/draf/<sasaran>.json` berisi array objek. Validasi: `python3 /home/claude/bank2/validasi.py draf/<sasaran>.json`.

## Field setiap objek
| field | isi |
|---|---|
| `k` | kode unik. Pola: `<SAS>-<GAME><nn>`; dilema `<SAS>-DB<n>-<NODE>`. SAS: SD, SMP, SMA, MHS, ASN, UMUM. GAME: KL, TT, TD, SPJ, SA. Contoh `SMA-TD03`, `UMUM-DB2-N1` |
| `g` | game: `kuis_live` · `terima_tolak` · `tebak_delik` · `detektif_spj` · `susun_alur` · `dilema` |
| `p` | prompt/soal. Kuis/TT/TD ≤ 30 kata (SD/SMP ≤ 20 kata). |
| `pl` | payload per game (lihat bawah) |
| `key` | kunci jawaban per game (lihat bawah) |
| `pb` | pembahasan 1–2 kalimat: kenapa jawabannya begitu (dilema: kosong) |
| `dh` | dasar hukum/rujukan. Untuk materi nilai/etika boleh "Nilai integritas KPK: Jujur" dsb. Ikuti FAKTA-REGULASI.md |
| `rf` | pertanyaan refleksi/diskusi 1 kalimat (wajib untuk kuis_live, opsional lain; dilema: hanya node akhir) |
| `d` | durasi detik: kuis_live 15–25 (SD 25), terima_tolak 15–20, tebak_delik 25, detektif_spj 60, susun_alur 45, dilema 60 |
| `t` | tingkat: `mudah` · `sedang` · `sulit` (dilema: "") |
| `tp` | topik (satu kunci): `nilai_integritas` · `dampak_korupsi` · `gratifikasi` · `pungli_layanan` · `pengadaan_spj` · `benturan_kepentingan` · `delik_korupsi` · `pelaporan` · `keluarga` · `sejarah_kpk` · `kejujuran_akademik` |
| `sas` | array sasaran, minimal sasaran file ini; tambah sasaran lain hanya bila soal benar-benar cocok. Nilai: `sd` `smp` `sma` `mahasiswa` `asn` `umum` |
| `src` | sumber: `"<judul buku>, hal. <n>"` dari ringkasan; bila dari FAKTA-REGULASI saja: `"Regulasi"` |
| `u` | urutan (angka berurutan dalam file) |

## Payload & kunci per game
- **kuis_live pilihan ganda**: `pl = {"tipe":"pg","opsi":{"A":"…","B":"…","C":"…","D":"…"}}`, `key = "C"`. Opsi ≤ 12 kata. Sebar kunci A–D merata.
- **kuis_live benar/salah**: `pl = {"tipe":"bs","opsi":{"BENAR":"Benar","SALAH":"Salah"}}`, `key = "BENAR"|"SALAH"`. Seimbangkan B/S.
- **terima_tolak**: `pl = {"pilihan":["AMAN","TOLAK-LAPOR"]}`, `key = "AMAN"|"TOLAK-LAPOR"`. Untuk siswa/umum, "AMAN" = boleh diterima/dilakukan, "TOLAK-LAPOR" = tolak/laporkan. Prompt = satu situasi pemberian/tawaran.
- **tebak_delik**: `pl = {"opsi":["Kerugian keuangan negara","Suap-menyuap","Penggelapan dalam jabatan","Pemerasan","Perbuatan curang","Benturan kepentingan dalam pengadaan","Gratifikasi"]}` (persis, urutan sama), `key` = salah satu string itu.
- **detektif_spj**: `p` = judul dokumen; `pl = {"konteks":"…1 kalimat…","elemen":[{"no":1,"teks":"…"}, … 6–8 elemen]}`, `key = [nomor elemen janggal]` (2–4 nomor). `pb` jelaskan tiap kejanggalan. Angka harus bisa dihitung peserta (cek aritmetika!).
- **susun_alur**: `p` = judul proses; `pl = {"langkah":[{"id":"s1","teks":"…"}, … 5–6 langkah, DIACAK urutannya]}`, `key = ["s1","s2",…]` urutan benar.
- **dilema**: satu cerita = 6 objek: N1, N2, N3 (keputusan) + END_BAIK, END_PULIH, END_BURUK (akhir). Semua objek cerita punya `pl.skenario_id` sama (mis. `"SD-DB1"`), `pl.judul` sama, `pl.indeks_awal = 50`.
  - Node keputusan: `pl = {"node":"N1","akhir":false,"judul":"…","pilihan":[{"id":"a","next":"N2","teks":"…"},{"id":"b","next":"N3","teks":"…"},{"id":"c","next":"N2","teks":"…"}],"indeks_awal":50,"skenario_id":"…"}`, `key = {"a":20,"b":-30,"c":-5}` (efek ke Indeks Integritas, −40..+25). N1 prompt diawali "Indeks Integritas awal: 50." Pola lintasan: N1 → N2 (jalur baik) / N3 (jalur salah); N2 → END_BAIK atau N3; N3 → END_PULIH (mengaku/memperbaiki) atau END_BURUK.
  - Node akhir: `pl = {"node":"END_BAIK","akhir":true,"judul":"…","pilihan":[],"indeks_awal":50,"skenario_id":"…"}`, `key = {}`, `rf` = pertanyaan refleksi.
  - `k` = `<SAS>-DB<n>-<NODE>`, `t` = "".

## Bahasa per sasaran
- SD (kelas 4–6): kalimat sangat pendek, kata sehari-hari, konteks rumah/sekolah/teman/jajan/kantin/uang kas kelas/ujian. Tanpa istilah pasal di prompt; `dh` boleh rujukan nilai ("Nilai integritas KPK: Jujur").
- SMP: konteks sekolah, OSIS, ekskul, tugas kelompok, media sosial, keluarga.
- SMA: + OSIS/kas kegiatan, PPDB/beasiswa (fiktif), mulai kenalkan jenis tipikor dan gratifikasi dasar.
- Mahasiswa: BEM/UKM, dana kegiatan, beasiswa, titip absen, plagiat, magang, konsep hukum lebih dalam.
- ASN: kantor pemerintah, pelayanan, pengadaan, perjalanan dinas, SPJ, UPG, WBS, atasan/bawahan.
- Umum: urusan KTP/SIM/izin usaha (fiktif), sekolah anak, bansos, pungli, peran keluarga, cara mengadu.
