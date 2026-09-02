import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthlyBreakdown,
  recurringMargin,
  cardCategoryBreakdown,
  pacStatus,
  accantonamentoDetail,
} from "../src/lib/analysis.js";

const REF = new Date(2026, 8, 15); // 15 settembre 2026, giorno "in mezzo" al ciclo carta (1-28)

function baseState(overrides = {}) {
  return {
    fixedExpenses: [],
    budgets: [],
    deadlines: [],
    cardTransactions: [],
    investments: [],
    investmentTransactions: [],
    ...overrides,
  };
}

test("monthlyBreakdown: esclude fixed_expenses categoria Investimenti (e' risparmio, non spesa)", () => {
  const state = baseState({
    fixedExpenses: [
      { active: true, category: "Investimenti", amount: 50 },
      { active: true, category: "Telecomunicazioni", amount: 30 },
    ],
  });
  const b = monthlyBreakdown(state, REF);
  assert.equal(b.total, 30);
  assert.deepEqual(b.rows, [{ category: "Telecomunicazioni", amount: 30 }]);
});

test("monthlyBreakdown: esclude fixed_expenses non attive", () => {
  const state = baseState({
    fixedExpenses: [{ active: false, category: "Casa", amount: 100 }],
  });
  assert.equal(monthlyBreakdown(state, REF).total, 0);
});

test("monthlyBreakdown: esclude deadlines 'Carta di Credito' e 'Abbonamento' (gia' contate altrove)", () => {
  const state = baseState({
    deadlines: [
      { category: "Carta di Credito", amount: 900, due_date: "2026-09-10" },
      { category: "Abbonamento", amount: 16.58, due_date: "2026-09-05" },
      { category: "Fisco", amount: 2941.05, due_date: "2026-09-20" },
    ],
  });
  const b = monthlyBreakdown(state, REF);
  assert.equal(b.total, 2941.05);
  assert.deepEqual(b.rows, [{ category: "Fisco", amount: 2941.05 }]);
});

test("monthlyBreakdown: esclude deadlines non in scadenza nel mese di riferimento", () => {
  const state = baseState({
    deadlines: [{ category: "Fisco", amount: 1000, due_date: "2026-10-20" }],
  });
  assert.equal(monthlyBreakdown(state, REF).total, 0);
});

test("monthlyBreakdown: raggruppa 'Debito' e 'Debito / X' sotto la famiglia Debiti, restando distinguibili per sottocategoria", () => {
  const state = baseState({
    fixedExpenses: [{ active: true, category: "Debito", amount: 500 }],
    deadlines: [
      { category: "Debito / Klarna", amount: 200, due_date: "2026-09-12" },
      { category: "Debito / Compass", amount: 150, due_date: "2026-09-18" },
    ],
  });
  const b = monthlyBreakdown(state, REF);
  assert.equal(b.total, 850);
  const byCat = Object.fromEntries(b.rows.map(r => [r.category, r.amount]));
  assert.deepEqual(byCat, { "Debiti": 500, "Debiti - Klarna": 200, "Debiti - Compass": 150 });
});

test("monthlyBreakdown: somma il tier Variabile Stimato e Accantonamento Mensilizzato del solo periodo piu' recente", () => {
  const state = baseState({
    budgets: [
      { tier: "Variabile Stimato", period: "2026-08", planned_amount: 999 },
      { tier: "Variabile Stimato", period: "2026-09", planned_amount: 100 },
      { tier: "Variabile Stimato", period: "2026-09", planned_amount: 50 },
      { tier: "Accantonamento Mensilizzato", period: "2026-09", planned_amount: 40 },
    ],
  });
  const b = monthlyBreakdown(state, REF);
  const byCat = Object.fromEntries(b.rows.map(r => [r.category, r.amount]));
  assert.deepEqual(byCat, { "Variabile Stimato": 150, "Accantonamento Mensilizzato": 40 });
});

test("recurringMargin: esclude Fisco dal totale, lascia intatto il resto", () => {
  const breakdown = {
    rows: [
      { category: "Fisco", amount: 3000 },
      { category: "Variabile Stimato", amount: 1200 },
      { category: "Debiti", amount: 500 },
    ],
  };
  const margin = recurringMargin(breakdown);
  assert.equal(margin.total, 1700);
  assert.equal(margin.rows.some(r => r.category === "Fisco"), false);
});

test("cardCategoryBreakdown: usa solo l'ultimo ciclo CHIUSO, combina Jo ed Eli, esclude le righe excluded_from_cycle", () => {
  const state = baseState({
    cardTransactions: [
      // ciclo chiuso: 29/07/2026 - 28/08/2026
      { person: "Jo", purchase_date: "2026-08-01", amount: 50, category: "Spesa", excluded_from_cycle: false },
      { person: "Jo", purchase_date: "2026-08-02", amount: 30, category: "Klarna (tracciato altrove)", excluded_from_cycle: true },
      { person: "Eli", purchase_date: "2026-08-03", amount: 20, category: "Spesa", excluded_from_cycle: false },
      // ciclo aperto: 29/08/2026 - 28/09/2026 (non deve entrare nel totale)
      { person: "Jo", purchase_date: "2026-09-05", amount: 999, category: "Spesa", excluded_from_cycle: false },
    ],
  });
  const result = cardCategoryBreakdown(state, REF);
  assert.equal(result.total, 70);
  assert.deepEqual(result.rows, [{ category: "Spesa", amount: 70 }]);
});

test("pacStatus: calcola il versato del mese di riferimento per ciascun investimento con PAC mensile impostato", () => {
  const state = baseState({
    investments: [
      { id: 1, name: "VWCE - Ambra", monthly_contribution: 16.67 },
      { id: 2, name: "VWCE - Bianca", monthly_contribution: 16.67 },
      { id: 3, name: "Trade Republic", monthly_contribution: 50 },
      { id: 4, name: "Nessun PAC", monthly_contribution: 0 },
    ],
    investmentTransactions: [
      { investment_id: 3, transaction_date: "2026-09-02", amount: 50 },
      { investment_id: 1, transaction_date: "2026-08-02", amount: 16.67 }, // mese sbagliato, non conta
    ],
  });
  const rows = pacStatus(state, REF);
  assert.equal(rows.length, 3); // il quarto (senza PAC) e' escluso
  const trTR = rows.find(r => r.name === "Trade Republic");
  assert.equal(trTR.versato, 50);
  assert.equal(trTR.complete, true);
  const ambra = rows.find(r => r.name === "VWCE - Ambra");
  assert.equal(ambra.versato, 0);
  assert.equal(ambra.complete, false);
});

test("accantonamentoDetail: prende solo il periodo piu' recente ed estrae l'etichetta dalle notes", () => {
  const state = baseState({
    budgets: [
      { tier: "Accantonamento Mensilizzato", period: "2026-08", category: "Salute", planned_amount: 999, actual_amount: 0, notes: "[x] vecchio - dettaglio" },
      { tier: "Accantonamento Mensilizzato", period: "2026-09", category: "Salute", planned_amount: 100, actual_amount: 20, notes: "[x] Salute - dettaglio" },
      { tier: "Accantonamento Mensilizzato", period: "2026-09", category: "Svago", planned_amount: 50, actual_amount: 0, notes: null },
    ],
  });
  const d = accantonamentoDetail(state);
  assert.equal(d.period, "2026-09");
  assert.equal(d.plannedTotal, 150);
  assert.equal(d.actualTotal, 20);
  assert.equal(d.rows.length, 2);
  assert.equal(d.rows[0].label, "Salute");
});

test("accantonamentoDetail: nessuna voce -> periodo null e totali a zero, senza errori", () => {
  const d = accantonamentoDetail(baseState());
  assert.equal(d.period, null);
  assert.equal(d.plannedTotal, 0);
  assert.equal(d.actualTotal, 0);
  assert.deepEqual(d.rows, []);
});
