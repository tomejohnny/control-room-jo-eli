-- Come fix_grants.sql, ma per service_role (usato dalla nuova chiave
-- sb_secret_... per bypassare RLS in api/calendar.ics.js). Anche il
-- BYPASSRLS non basta se mancano i GRANT di base sulla tabella.
-- Sicuro da rieseguire piu' volte.

grant usage on schema public to service_role;

grant select, insert, update, delete on public.cash_movements to service_role;
grant select, insert, update, delete on public.fixed_expenses to service_role;
grant select, insert, update, delete on public.recurring_income to service_role;
grant select, insert, update, delete on public.deadlines to service_role;
grant select, insert, update, delete on public.investments to service_role;
grant select, insert, update, delete on public.investment_transactions to service_role;
grant select, insert, update, delete on public.audit_log to service_role;
grant select, insert, update, delete on public.budgets to service_role;

grant usage, select on all sequences in schema public to service_role;
