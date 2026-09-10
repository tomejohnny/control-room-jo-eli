-- Aggiunge il flag "gia_in_liquidazione_carta" a deadlines: righe il cui
-- importo e' gia' stato addebitato su una carta di credito ed e' in attesa
-- solo della liquidazione del ciclo (es. rate Klarna mensili, categoria
-- "Debito / Klarna") - il loro due_date riflette la scadenza verso il
-- fornitore, non la data reale di uscita dei soldi dal conto corrente, che
-- segue invece il ciclo carta (18 del mese), gia' gestito separatamente da
-- card_transactions/liquidazione carta. Richiesto da Jo il 10/09/2026 come
-- seguito al fix del Margine Fine Mese.
--
-- Il flag NON va esteso alle scadenze "Carta di Credito - liquidazione
-- ciclo" stesse: quelle sono l'uscita di cassa reale del ciclo, non ancora
-- tracciata altrove nel Margine Fine Mese - confermato con Jo il 10/09/2026.
--
-- Le righe flaggate restano visibili nello Scadenziario (nessun filtro li'):
-- il flag esclude solo dal calcolo del Margine Fine Mese, non nasconde
-- l'obbligo verso il fornitore.
alter table public.deadlines
  add column if not exists gia_in_liquidazione_carta boolean not null default false;

update public.deadlines
  set gia_in_liquidazione_carta = true
  where category = 'Debito / Klarna';
