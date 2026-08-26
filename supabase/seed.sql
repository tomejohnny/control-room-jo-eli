-- Family Holding Control Room — seed dei dati reali attualmente hardcoded
-- nel vecchio index.html (defaultTransactions, defaultBudget, defaultFixedIncomes,
-- defaultDeadlines) + righe iniziali investments.
--
-- Eseguire UNA SOLA VOLTA nell'SQL Editor di Supabase, DOPO schema_updates.sql.
-- Rieseguirlo duplica le righe (nessun controllo di idempotenza qui, per
-- semplicita' - e' un seed una tantum).

-- Cash Flow: cash_movements
insert into public.cash_movements (movement_date, description, subject, movement_type, amount, account, status) values
  ('2026-08-01', 'Saldo Iniziale Banca della Marca', 'Famiglia', 'ENTRATA', 4415.07, 'Banca della Marca', 'Registrato'),
  ('2026-08-15', 'Uscita Rate Yaris Cross (Saldate)', 'Jo', 'USCITA', 430.00, 'Banca della Marca', 'Registrato'),
  ('2026-08-15', 'Accredito Stipendio Tessaro S.p.A.', 'Jo', 'ENTRATA', 5500.00, 'Banca della Marca', 'Registrato'),
  ('2026-08-18', 'Rata Mutuo Bioedilizia', 'Famiglia', 'USCITA', 2530.00, 'Banca della Marca', 'Registrato'),
  ('2026-08-26', 'Bolletta Enel', 'Famiglia', 'USCITA', 297.00, 'Banca della Marca', 'Registrato'),
  ('2026-08-31', '1^ Rata F24 (Saldi + Acconti)', 'Jo', 'USCITA', 2941.04, 'Banca della Marca', 'Registrato'),
  ('2026-08-31', 'Carte di Credito (Spese Luglio)', 'Jo & Eli', 'USCITA', 2997.67, 'Banca della Marca', 'Registrato');

-- Master Budget: fixed_expenses (amount = importo mensile equivalente)
insert into public.fixed_expenses (description, category, subject, frequency, amount, active) values
  ('Mutuo Casa', 'Debito / Immobiliare', 'Famiglia', 'Mensile', 2530.00, true),
  ('Prestito Personale Banca', 'Debito', 'Famiglia', 'Mensile', 255.00, true),
  ('Agenzia delle Entrate', 'Debito / Fiscale', 'Famiglia', 'Mensile', 157.00, true),
  ('Spesa Alimentare e Beni di Consumo', 'Famiglia / Supermercato', 'Famiglia', 'Mensile', 650.00, true),
  ('Enel Energia', 'Utenze Casa', 'Famiglia', 'Mensile', 150.00, true),
  ('Servizio Acqua Potabile', 'Utenze Casa', 'Famiglia', 'Annuale (Mensilizzato)', 37.50, true),
  ('Savno Raccolta Rifiuti', 'Utenze Casa', 'Famiglia', 'Annuale (Mensilizzato)', 20.83, true),
  ('Assicurazione Casa', 'Protezione', 'Famiglia', 'Annuale (Mensilizzato)', 25.00, true),
  ('Mensa Scolastica Bambine', 'Figlie', 'Famiglia', 'Settimanale (Mensilizzato)', 80.00, true),
  ('Ginnastica Artistica Bambine', 'Figlie', 'Famiglia', 'Mensile', 77.78, true),
  ('Apparecchio Dentale Bambine', 'Figlie (Salute)', 'Famiglia', 'Mensile', 141.67, true),
  ('Benzina Yaris Cross (Elisa)', 'Mobilità / Lavoro', 'Eli', 'Annuale (Mensilizzato)', 75.00, true),
  ('Assicurazione Auto (Elisa)', 'Mobilità / Lavoro', 'Eli', 'Annuale (Mensilizzato)', 58.33, true),
  ('Tagliando & Gomme (Elisa)', 'Mobilità / Lavoro', 'Eli', 'Straordinario (Mensilizzato)', 37.50, true),
  ('Cane (Cibo + Veterinario)', 'Animali', 'Famiglia', 'Misto (Mensilizzato)', 65.00, true),
  ('Canva (Eli)', 'Lavoro (Strumenti)', 'Eli', 'Mensile', 12.00, true),
  ('Abbonamenti Gemini (Jo & Eli)', 'Lavoro / Tech', 'Jo & Eli', 'Mensile', 44.00, true),
  ('Fastweb Cellulare (Jo)', 'Telecomunicazioni', 'Jo', 'Mensile', 13.00, true),
  ('Wind Cellulare (Eli)', 'Telecomunicazioni', 'Eli', 'Mensile', 12.00, true),
  ('Abbonamento Sky', 'Intrattenimento', 'Famiglia', 'Mensile', 27.24, true),
  ('Amazon Music', 'Intrattenimento', 'Famiglia', 'Mensile', 18.00, true),
  ('Amazon Prime', 'Servizi', 'Famiglia', 'Annuale (Mensilizzato)', 3.92, true),
  ('Canone TV', 'Tasse', 'Famiglia', 'Annuale (Mensilizzato)', 8.33, true),
  ('CapCut', 'Tech / Abbonamenti', 'Eli', 'Mensile', 23.99, true),
  ('Abbigliamento Famiglia', 'Spese Personali', 'Famiglia', 'Annuale (Mensilizzato)', 146.66, true),
  ('Casa, Giardino e Piscina', 'Manutenzione', 'Famiglia', 'Annuale (Mensilizzato)', 133.34, true),
  ('Salute / Farmacia / Check-up', 'Salute', 'Famiglia', 'Annuale (Mensilizzato)', 50.00, true),
  ('Fondo Vacanze / Svago', 'Tempo Libero', 'Famiglia', 'Mensile', 150.00, true),
  ('PAC Trade Republic', 'Investimenti', 'Jo', 'Mensile', 50.00, true),
  ('Rata Yaris', 'Debito', 'Jo', 'Mensile', 215.00, true);

-- Entrate Fisse: recurring_income
insert into public.recurring_income (description, subject, frequency, monthly_amount, active) values
  ('Studio Metroquadrato (Consulenza Elisa)', 'Eli', 'Mensile', 1700.00, true);

-- Scadenziario: deadlines
insert into public.deadlines (title, category, subject, due_date, amount, status, priority) values
  ('Check Giornaliero GLG Opportunities', 'Business', 'Jo', '2026-08-16', 0.00, 'In Scadenza', 'Alta'),
  ('Rata Mutuo Bioedilizia', 'Debito', 'Famiglia', '2026-08-18', 2530.00, 'In Scadenza', 'Alta'),
  ('Bolletta Enel', 'Utenza', 'Famiglia', '2026-08-26', 297.00, 'Pianificato', 'Media'),
  ('1^ Rata F24 (Saldi + Acconti)', 'Fisco', 'Jo', '2026-08-31', 2941.04, 'Critico', 'Critica'),
  ('2° Acconto Novembre (Jo)', 'Fisco', 'Jo', '2026-11-30', 4286.00, 'Pianificato', 'Media'),
  ('2° Acconto Novembre (Eli)', 'Fisco', 'Eli', '2026-11-30', 278.61, 'Pianificato', 'Media'),
  ('Piano Klarna Residuo', 'Debito Breve Termine', 'Famiglia', '2027-08-01', 270.00, 'Pianificato', 'Media');

-- Investimenti: Ambra & Bianca (V80A) + Capex/PAC
insert into public.investments (name, asset_type, provider, current_value, monthly_contribution, status, last_update) values
  ('V80A - Ambra', 'fondo_studio', 'Vanguard', 28.50, 0, 'active', now()),
  ('V80A - Bianca', 'fondo_studio', 'Vanguard', 28.50, 0, 'active', now()),
  ('Trade Republic NASDAQ100', 'pac', 'Trade Republic', 0, 50.00, 'active', now());
