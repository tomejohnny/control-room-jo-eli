// "Dove Va il Denaro": la stessa fotografia gia' pubblicata come dashboard
// statica (artifact Claude del 02/09/2026, richiesta da Jo il 01/09/2026)
// ma calcolata live sui dati veri di Supabase invece di restare la foto del
// giorno in cui e' stata fatta - "metterei live 'dove va il denaro della
// famiglia'" (Jo, 02/09/2026).
//
// Principi anti-doppio-conteggio (identici alla versione statica):
//  - fixed_expenses categoria "Investimenti" e' risparmio, non spesa - non
//    entra nel totale spese (la sua fotografia e' pacStatus, sotto).
//  - deadlines categoria "Carta di Credito" e' un aggregato per metodo di
//    pagamento, non una spesa a se' - il dettaglio vero delle spese fatte
//    con carta si vede in cardCategoryBreakdown, dal ciclo carta chiuso.
//  - deadlines categoria "Abbonamento" (es. CapCut) e' gia' ammortizzata
//    dentro la corrispondente voce di Accantonamento Mensilizzato - esclusa
//    qui per non contarla due volte.
//  - card_transactions: si usa solo l'ultimo ciclo CHIUSO (dati verificati
//    completi), non quello aperto/parziale ancora in corso, e si escludono
//    le righe excluded_from_cycle (gia' tracciate altrove) - lo fa gia'
//    groupTransactionsByCycle().

import { isSameMonth } from "./format.js";
import { groupTransactionsByCycle } from "./cardtransactions.js";
import { monthlyEquivalentAmount } from "./finance.js";

const EXCLUDED_DEADLINE_CATEGORIES = new Set(["Carta di Credito", "Abbonamento"]);

// Le categorie "Debito" e "Debito / <nome>" (fixed_expenses e deadlines)
// vengono raggruppate sotto un'unica famiglia "Debiti", ma restano
// distinguibili per sottocategoria - cosi' un nuovo debito one-off futuro
// (es. una rateazione Compass per la piscina, gia' vista nei dati reali)
// si etichetta da solo senza bisogno di toccare questo file.
function displayCategory(rawCategory) {
  const cat = String(rawCategory || "Non categorizzato").trim();
  if (cat === "Debito") return "Debiti";
  if (cat.startsWith("Debito /")) return "Debiti - " + cat.slice("Debito /".length).trim();
  if (cat.startsWith("Debito")) return "Debiti - " + cat.slice("Debito".length).replace(/^[\s/]+/, "").trim();
  return cat;
}

function sumTierLatestPeriod(budgets, tier) {
  const rows = budgets.filter(b => b.tier === tier);
  const periods = [...new Set(rows.map(b => b.period))].sort();
  const latestPeriod = periods[periods.length - 1];
  return rows.filter(b => b.period === latestPeriod).reduce((s, b) => s + Number(b.planned_amount || 0), 0);
}

function fmtCycleDate(d) {
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

// Fotografia completa della spesa del mese "ref": spese fisse ricorrenti +
// scadenze in scadenza questo mese (fisco, debiti one-off) + le due voci di
// budget del periodo piu' recente (Variabile Stimato, Accantonamento
// Mensilizzato). Righe della stessa categoria si sommano in un'unica barra.
export function monthlyBreakdown(state, ref = new Date()) {
  const { fixedExpenses = [], budgets = [], deadlines = [] } = state;
  const items = [];

  fixedExpenses
    .filter(f => f.active !== false && f.category !== "Investimenti")
    .forEach(f => items.push({ category: displayCategory(f.category), amount: monthlyEquivalentAmount(f.amount, f.frequency) }));

  deadlines
    .filter(d => isSameMonth(d.due_date, ref))
    .filter(d => !EXCLUDED_DEADLINE_CATEGORIES.has(d.category))
    .forEach(d => items.push({ category: displayCategory(d.category), amount: Number(d.amount || 0) }));

  const variabileTotal = sumTierLatestPeriod(budgets, "Variabile Stimato");
  if (variabileTotal > 0) items.push({ category: "Variabile Stimato", amount: variabileTotal });

  const accantTotal = sumTierLatestPeriod(budgets, "Accantonamento Mensilizzato");
  if (accantTotal > 0) items.push({ category: "Accantonamento Mensilizzato", amount: accantTotal });

  const byCategory = {};
  items.forEach(({ category, amount }) => {
    byCategory[category] = (byCategory[category] || 0) + amount;
  });

  const rows = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .filter(r => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, total, ref };
}

// Lo stesso totale, senza Fisco - il margine su cui la famiglia puo'
// davvero intervenire (le tasse dovute non sono negoziabili giorno per
// giorno, il resto in parte si').
export function recurringMargin(breakdown) {
  const rows = breakdown.rows.filter(r => r.category !== "Fisco");
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, total };
}

// Dove va davvero la spesa con le carte: Jo + Eli, solo l'ultimo ciclo
// CHIUSO (29 del mese - 28 del successivo), combinati in un'unica
// fotografia per categoria.
export function cardCategoryBreakdown(state, ref = new Date()) {
  const persons = ["Jo", "Eli"];
  const byCategory = {};
  let total = 0;
  let cycleLabel = "";

  persons.forEach(person => {
    const groups = groupTransactionsByCycle(state.cardTransactions || [], person, ref, 2);
    const closed = groups[1];
    if (!closed) return;
    total += closed.total;
    if (!cycleLabel) {
      cycleLabel = `${fmtCycleDate(closed.cycleStart)} - ${fmtCycleDate(closed.cycleEnd)}`;
    }
    Object.entries(closed.byCategory).forEach(([cat, amount]) => {
      byCategory[cat] = (byCategory[cat] || 0) + amount;
    });
  });

  const rows = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return { rows, total, cycleLabel };
}

// Piani di accumulo: pianificato (investments.monthly_contribution) vs.
// versato questo mese (somma investment_transactions dello stesso mese di
// ref, per investment_id). Generico su tutti gli investimenti con un PAC
// mensile impostato, cosi' un nuovo PAC futuro compare da solo.
export function pacStatus(state, ref = new Date()) {
  const { investments = [], investmentTransactions = [] } = state;
  return investments
    .filter(inv => Number(inv.monthly_contribution || 0) > 0)
    .map(inv => {
      const planned = Number(inv.monthly_contribution || 0);
      const versato = investmentTransactions
        .filter(t => t.investment_id === inv.id && isSameMonth(t.transaction_date, ref))
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      return {
        name: inv.name,
        planned,
        versato,
        pct: planned > 0 ? Math.min(versato / planned, 1) : 0,
        complete: versato >= planned && planned > 0,
      };
    });
}

// Dettaglio Accantonamento Mensilizzato del periodo piu' recente: quanto
// pianificato per voce (planned_amount) e quanto effettivamente accantonato
// (actual_amount - colonna gia' presente nello schema ma non ancora
// popolata da nessuno: i totali tornano onestamente a 0 finche' Jo/Eli non
// iniziano a usarla, non e' un bug).
export function accantonamentoDetail(state) {
  const { budgets = [] } = state;
  const all = budgets.filter(b => b.tier === "Accantonamento Mensilizzato");
  const periods = [...new Set(all.map(b => b.period))].sort();
  const latestPeriod = periods[periods.length - 1] || null;

  const rows = all
    .filter(b => b.period === latestPeriod)
    .map(b => ({
      label: (b.notes || "").replace(/^\[[^\]]+\]\s*/, "").split(" - ")[0] || b.category,
      category: b.category,
      planned: Number(b.planned_amount || 0),
      actual: Number(b.actual_amount || 0),
    }))
    .sort((a, b) => b.planned - a.planned);

  const plannedTotal = rows.reduce((s, r) => s + r.planned, 0);
  const actualTotal = rows.reduce((s, r) => s + r.actual, 0);

  return { period: latestPeriod, rows, plannedTotal, actualTotal };
}
