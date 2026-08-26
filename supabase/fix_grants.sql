-- Fix: "permission denied for table X" con utente autenticato.
-- Le policy RLS controllano QUALI righe si vedono, ma il ruolo authenticated
-- deve anche avere i permessi di base (GRANT) sulla tabella - senza,
-- Postgres nega l'accesso ancora prima di valutare le policy.
-- Sicuro da rieseguire piu' volte (GRANT e' idempotente).

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.cash_movements to authenticated;
grant select, insert, update, delete on public.fixed_expenses to authenticated;
grant select, insert, update, delete on public.recurring_income to authenticated;
grant select, insert, update, delete on public.deadlines to authenticated;
grant select, insert, update, delete on public.investments to authenticated;
grant select, insert, update, delete on public.investment_transactions to authenticated;
grant select, insert, update, delete on public.audit_log to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;

-- Difensivo: alcune colonne id potrebbero usare sequenze esplicite.
grant usage, select on all sequences in schema public to authenticated;
