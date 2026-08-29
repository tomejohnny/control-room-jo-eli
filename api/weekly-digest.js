import { createClient } from "@supabase/supabase-js";
import {
  bankBalance, monthEndMargin, dscr, liquidityMonths, netWorth, savingsRate,
} from "../src/lib/finance.js";
import { getUrgentDeadlines } from "../src/lib/alerts.js";

// Riepilogo settimanale in JSON, riusa le stesse formule di src/lib/finance.js
// (nessun numero duplicato/divergente da quello che si vede nell'app).
// Stesso pattern di sicurezza di api/calendar.ics.js: token in query string +
// service role key server-side, perche' questo endpoint viene letto da una
// routine pianificata senza login Supabase.

export default async function handler(req, res) {
  const token = req.query?.token;
  if (!token || token !== process.env.WEEKLY_DIGEST_TOKEN) {
    res.status(403).send("Forbidden");
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).json({ error: "Configurazione mancante: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY." });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const tables = ["cash_movements", "fixed_expenses", "recurring_income", "deadlines", "investments", "investment_transactions"];
  const results = {};
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      res.status(500).json({ error: `Errore su ${table}: ${error.message}` });
      return;
    }
    results[table] = data || [];
  }

  const { cash_movements, fixed_expenses, recurring_income, deadlines, investments, investment_transactions } = results;

  const urgentDeadlines = getUrgentDeadlines(deadlines).slice(0, 8).map(d => ({
    title: d.title,
    amount: Number(d.amount || 0),
    due_date: d.due_date,
    status: d.status,
  }));

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json({
    generated_at: new Date().toISOString(),
    saldo_cassa: bankBalance(cash_movements),
    margine_fine_mese: monthEndMargin(cash_movements, deadlines),
    dscr: dscr(recurring_income, fixed_expenses),
    liquidita_mesi: liquidityMonths(cash_movements, fixed_expenses),
    patrimonio_netto: netWorth(cash_movements, fixed_expenses, investments, investment_transactions),
    tasso_risparmio: savingsRate(recurring_income, fixed_expenses),
    scadenze_imminenti: urgentDeadlines,
  });
}
