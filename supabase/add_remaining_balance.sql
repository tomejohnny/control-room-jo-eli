-- Capitale residuo dei debiti (mutuo, prestiti), per calcolare un vero
-- Patrimonio Netto (attivo - passivo) invece del solo patrimonio lordo.
-- Campo opzionale: da aggiornare occasionalmente controllando l'estratto
-- conto del finanziamento (non richiede un aggiornamento mensile).
-- Eseguire una sola volta nell'SQL Editor di Supabase.

alter table public.fixed_expenses add column if not exists remaining_balance numeric(12,2);

grant select, insert, update, delete on public.fixed_expenses to authenticated;
grant select, insert, update, delete on public.fixed_expenses to service_role;
