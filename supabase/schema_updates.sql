-- Family Holding Control Room — aggiornamenti schema per la riscrittura Supabase-only.
-- Eseguire questo script per intero nell'SQL Editor di Supabase (progetto control-room-jo-eli)
-- PRIMA di eseguire seed.sql.

-- 1) Nuova tabella: storico versamenti Ambra & Bianca (e, se usata, altri investimenti a rate)
create table if not exists public.investment_transactions (
  id bigint generated always as identity primary key,
  investment_id bigint not null references public.investments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  units numeric(14,6) not null check (units > 0),
  transaction_date date not null default current_date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investment_transactions_investment_id_idx
  on public.investment_transactions (investment_id);

-- Trigger generico per aggiornare updated_at (riusa la funzione se già presente nel progetto)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.investment_transactions;
create trigger set_updated_at
  before update on public.investment_transactions
  for each row execute function public.set_updated_at();

-- 2) RLS: stesso pattern "authenticated_all" già usato sulle altre tabelle
alter table public.investment_transactions enable row level security;

drop policy if exists authenticated_investment_transactions_all on public.investment_transactions;
create policy authenticated_investment_transactions_all
  on public.investment_transactions
  for all
  to authenticated
  using (true)
  with check (true);

-- 3) Pulizia: rimuove le policy pubbliche (anon) residue su cash_movements,
--    lasciate da test precedenti. Da qui in poi solo utenti autenticati.
drop policy if exists cash_movements_delete_public on public.cash_movements;
drop policy if exists cash_movements_update_public on public.cash_movements;
drop policy if exists cash_movements_insert_public on public.cash_movements;
drop policy if exists cash_movements_select_public on public.cash_movements;
