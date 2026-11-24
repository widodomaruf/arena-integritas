-- Perbaikan audit keamanan 24 Nov 2026 (sudah diterapkan ke proyek udnfdxmlvhitcojuuqhd).
-- T-1 + R-4: penilaian Detektif SPJ memakai elemen unik, pecahan maks 1, jawaban dibatasi 4 KB.
--   Perubahan di submit_answer: cek `pg_column_size(p_jawaban) > 4096`, cek tipe array untuk 'pilihan',
--   `from (select distinct e from jsonb_array_elements(...) e) d`, dan `v_frac := least(1, ...)`.
-- S-1: akun anonim tidak boleh menulis bank/soal/rahasia; bank tidak boleh dibuat publik oleh klien.
alter policy bank_insert on public.question_banks
  with check (owner_id = auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false and is_public = false);
alter policy bank_update on public.question_banks
  using (owner_id = auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false)
  with check (owner_id = auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false and is_public = false);
alter policy bank_delete on public.question_banks
  using (owner_id = auth.uid() and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false);
alter policy q_write on public.questions
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false and exists (select 1 from question_banks b where b.id = questions.bank_id and b.owner_id = auth.uid()))
  with check (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false and exists (select 1 from question_banks b where b.id = questions.bank_id and b.owner_id = auth.uid()));
alter policy qs_owner on public.question_secrets
  using (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false and exists (select 1 from questions q join question_banks b on b.id = q.bank_id where q.id = question_secrets.question_id and b.owner_id = auth.uid()))
  with check (coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false and exists (select 1 from questions q join question_banks b on b.id = q.bank_id where q.id = question_secrets.question_id and b.owner_id = auth.uid()));
-- R-3: hanya host yang boleh menghapus pemain.
alter policy p_delete on public.players using (is_session_host(session_id));
-- R-2: cabut hak berlebih.
revoke all on all tables in schema public from anon;
revoke truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
