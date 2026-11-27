-- Perbaikan audit 25 Nov 2026 (S-2, N-2). Diterapkan ke proyek udnfdxmlvhitcojuuqhd.

-- S-2: batas percobaan PIN per akun anonim + PIN dari sumber acak kriptografis.
create table if not exists public.join_attempts (
  auth_uid uuid not null,
  at timestamptz not null default now()
);
create index if not exists join_attempts_uid_at on public.join_attempts (auth_uid, at desc);
alter table public.join_attempts enable row level security;
revoke all on public.join_attempts from anon, authenticated;

create or replace function public.join_session(p_pin text, p_nama text, p_tim text default null)
returns players language plpgsql security definer set search_path to 'public' as $$
declare v_s sessions; v_p players; v_gagal int;
begin
  if auth.uid() is null then raise exception 'Harus login (anonim)'; end if;
  delete from join_attempts where auth_uid = auth.uid() and at < now() - interval '1 hour';
  select count(*) into v_gagal from join_attempts where auth_uid = auth.uid() and at > now() - interval '10 minutes';
  if v_gagal >= 8 then raise exception 'Terlalu banyak percobaan PIN. Tunggu beberapa menit.'; end if;
  select * into v_s from sessions where pin = p_pin and status <> 'ended';
  if not found then
    -- Dikembalikan null (bukan exception) agar catatan percobaan tidak ikut dibatalkan.
    insert into join_attempts(auth_uid) values (auth.uid());
    return null;
  end if;
  insert into players(session_id, auth_uid, nama, tim)
  values (v_s.id, auth.uid(), trim(p_nama), nullif(trim(p_tim),''))
  on conflict (session_id, auth_uid) do update set nama = excluded.nama, tim = excluded.tim
  returning * into v_p;
  return v_p;
end $$;

create or replace function public.create_session(p_bank uuid, p_game text, p_mode text default 'individu')
returns sessions language plpgsql security definer set search_path to 'public' as $$
declare v_pin text; v_row sessions;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Hanya fasilitator yang login dengan email yang bisa membuat sesi';
  end if;
  if p_game not in ('kuis_live','terima_tolak','tebak_delik','detektif_spj','dilema','susun_alur','campuran') then
    raise exception 'Jenis game tidak dikenal';
  end if;
  if not exists(select 1 from question_banks where id = p_bank and (owner_id = auth.uid() or is_public)) then
    raise exception 'Bank soal tidak ditemukan';
  end if;
  loop
    -- gen_random_uuid() memakai sumber acak kriptografis; 32 bit mod 1.000.000 (bias diabaikan).
    v_pin := lpad((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 1000000)::text, 6, '0');
    exit when not exists(select 1 from sessions where pin = v_pin);
  end loop;
  insert into sessions(pin, host_id, bank_id, game, mode) values (v_pin, auth.uid(), p_bank, p_game, p_mode)
  returning * into v_row;
  return v_row;
end $$;

-- N-2: klien hanya boleh mengubah durasi, judul, dan daftar soal; status dan soal aktif lewat RPC.
revoke update on public.sessions from authenticated;
grant update (durasi_detik, judul, soal_ids) on public.sessions to authenticated;

-- N-2 (lapis kedua): get_reveal hanya membuka kunci soal dari bank sesi itu.
create or replace function public.get_reveal(p_session uuid)
returns table(question_id uuid, kunci jsonb, pembahasan text, dasar_hukum text, refleksi text)
language plpgsql stable security definer set search_path to 'public' as $$
declare v_s sessions;
begin
  select * into v_s from sessions where id = p_session;
  if not found then raise exception 'Sesi tidak ditemukan'; end if;
  if not (v_s.host_id = auth.uid() or is_session_player(p_session)) then raise exception 'Tidak berhak'; end if;
  if v_s.status not in ('reveal','ended') and v_s.host_id <> auth.uid() then raise exception 'Belum waktunya'; end if;
  return query select q.id, sc.kunci, sc.pembahasan, q.dasar_hukum, q.refleksi
    from questions q join question_secrets sc on sc.question_id = q.id
    where q.id = v_s.current_question_id and q.bank_id = v_s.bank_id;
end $$;
