import { test } from "node:test";
import assert from "node:assert/strict";
import { bankBalance, monthEndMargin, quarterlyTreasury, dscr, liquidityMonths } from "../src/lib/finance.js";

test("bankBalance: somma entrate/uscite confermate, ignora i movimenti Previsto", () => {
  const movements = [
    { movement_type: "ENTRATA", amount: 1000, status: "Confermato" },
    { movement_type: "USCITA", amount: 200, status: "Confermato" },
    { movement_type: "USCITA", amount: 5000, status: "Previsto" }, // bozza non confermata, non deve contare
  ];
  assert.equal(bankBalance(movements), 800);
});

test("monthEndMargin: le scadenze Sospesa NON riducono il margine (regressione 31/08/2026)", () => {
  // Caso reale che ha generato il bug: saldo 3926, una bolletta reale (297)
  // e una rata F24 congelata (2941.05) nello stesso mese. Il margine deve
  // riflettere solo la cassa reale attesa, non il debito congelato.
  const cashMovements = [{ movement_type: "ENTRATA", amount: 3926, status: "Confermato" }];
  const ref = new Date("2026-09-15");
  const deadlines = [
    { title: "Bolletta Enel", amount: 297, due_date: "2026-09-20", status: "Media" },
    { title: "F24 Rata 1/5", amount: 2941.05, due_date: "2026-09-20", status: "Sospesa" },
  ];
  assert.equal(monthEndMargin(cashMovements, deadlines, ref), 3926 - 297);
});

test("monthEndMargin: una scadenza normale (non Sospesa, non Completato) riduce il margine", () => {
  const cashMovements = [{ movement_type: "ENTRATA", amount: 1000, status: "Confermato" }];
  const ref = new Date("2026-09-15");
  const deadlines = [{ amount: 300, due_date: "2026-09-20", status: "Media" }];
  assert.equal(monthEndMargin(cashMovements, deadlines, ref), 700);
});

test("monthEndMargin: una scadenza Completato non riduce il margine", () => {
  const cashMovements = [{ movement_type: "ENTRATA", amount: 1000, status: "Confermato" }];
  const ref = new Date("2026-09-15");
  const deadlines = [{ amount: 300, due_date: "2026-09-20", status: "Completato" }];
  assert.equal(monthEndMargin(cashMovements, deadlines, ref), 1000);
});

test("quarterlyTreasury: le scadenze Sospesa non pesano sull'uscita una tantum del trimestre", () => {
  const recurringIncome = [{ monthly_amount: 1000, active: true }];
  const fixedExpenses = [{ amount: 500, active: true }];
  const ref = new Date("2026-09-01");
  const deadlines = [
    { amount: 2941.05, due_date: "2026-09-16", status: "Sospesa" },
    { amount: 300, due_date: "2026-09-20", status: "Media" },
  ];
  const [firstQuarter] = quarterlyTreasury(recurringIncome, fixedExpenses, deadlines, 1, ref);
  // spesa attesa = spese fisse * 3 mesi + solo la scadenza non sospesa
  assert.equal(firstQuarter.expense, 500 * 3 + 300);
});

test("dscr: null quando non ci sono debiti (evita divisione per zero)", () => {
  assert.equal(dscr([{ monthly_amount: 1000, active: true }], [{ amount: 100, active: true, category: "Casa" }]), null);
});

test("dscr: rapporto entrate/rate debito quando la categoria contiene 'debito'", () => {
  const income = [{ monthly_amount: 2000, active: true }];
  const expenses = [{ amount: 500, active: true, category: "Debito - Mutuo" }];
  assert.equal(dscr(income, expenses), 4);
});

test("liquidityMonths: null quando le spese fisse sono zero", () => {
  assert.equal(liquidityMonths([{ movement_type: "ENTRATA", amount: 100, status: "Confermato" }], []), null);
});
