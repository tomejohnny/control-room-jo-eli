-- Aggiunge il tracciamento quote/prezzo live anche per Capex & PAC
-- (finora disponibile solo per Ambra & Bianca). Eseguire una sola volta
-- nell'SQL Editor di Supabase, dopo schema_updates.sql e fix_grants.sql.

-- 1) Colonna ticker (simbolo di mercato per il prezzo live via /api/etf-price)
alter table public.investments add column if not exists ticker text;

grant select, insert, update, delete on public.investments to authenticated;

-- 2) Ticker per gli investimenti gia' seminati
update public.investments set ticker = 'V80A.DE' where name in ('V80A - Ambra', 'V80A - Bianca');
update public.investments set ticker = 'XNAS.DE' where name = 'Trade Republic NASDAQ100';

-- 3) Posizione reale attuale su Trade Republic NASDAQ100:
--    0,829598 quote per un capitale versato di 50,00 EUR (prezzo carico ~60,27/quota,
--    verra' sovrascritto al primo "Aggiorna Prezzo" con il prezzo live reale).
insert into public.investment_transactions (investment_id, amount, units, transaction_date)
select id, 50.00, 0.829598, current_date
from public.investments
where name = 'Trade Republic NASDAQ100';

update public.investments
set current_value = round(50.00 / 0.829598, 4)
where name = 'Trade Republic NASDAQ100';
