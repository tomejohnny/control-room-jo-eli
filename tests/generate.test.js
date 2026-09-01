import { test } from "node:test";
import assert from "node:assert/strict";
import { planMonthlyMovements } from "../src/lib/generate.js";

test("planMonthlyMovements: genera un movimento Previsto per ogni voce Fisso Certo attiva non ancora registrata", () => {
  const fixedExpenses = [
    { description: "Mutuo Casa", subject: "Jo", amount: 2549.14, due_day: 5, category: "Casa", active: true },
  ];
  const plans = planMonthlyMovements(fixedExpenses, [], [], "2026-09");
  assert.equal(plans.length, 1);
  assert.equal(plans[0].movement_date, "2026-09-05");
  assert.equal(plans[0].amount, 2549.14);
  assert.equal(plans[0].status, "Previsto");
});

test("planMonthlyMovements: NON genera movimento per una voce gia' registrata nel mese (stessa descrizione)", () => {
  const fixedExpenses = [
    { description: "Mutuo Casa", subject: "Jo", amount: 2549.14, due_day: 5, category: "Casa", active: true },
  ];
  const existing = [{ movement_date: "2026-09-05", description: "Mutuo Casa" }];
  const plans = planMonthlyMovements(fixedExpenses, [], existing, "2026-09");
  assert.equal(plans.length, 0);
});

test("planMonthlyMovements: NON genera movimento per una voce disattivata", () => {
  const fixedExpenses = [
    { description: "CapCut", subject: "Jo", amount: 199.99, due_day: 27, category: "Tech", active: false },
  ];
  const plans = planMonthlyMovements(fixedExpenses, [], [], "2026-09");
  assert.equal(plans.length, 0);
});

test("planMonthlyMovements: NON genera movimento per una voce paid_by_card=true (evita doppio conteggio con la liquidazione carta)", () => {
  // Caso reale 01/09/2026: Claude Pro e Amazon Music sono Fisso Certo ma
  // pagati con la carta di credito di Jo - il loro importo e' gia' incluso
  // nella scadenza aggregata "Carta di Credito" (deadlines), quindi non
  // deve generare anche un movimento mensile separato.
  const fixedExpenses = [
    { description: "Claude Pro (Jo)", subject: "Jo", amount: 21.96, due_day: 26, category: "Lavoro / Tech", active: true, paid_by_card: true },
    { description: "Mutuo Casa", subject: "Jo", amount: 2549.14, due_day: 5, category: "Casa", active: true, paid_by_card: false },
  ];
  const plans = planMonthlyMovements(fixedExpenses, [], [], "2026-09");
  assert.equal(plans.length, 1);
  assert.equal(plans[0].description, "Mutuo Casa");
});

test("planMonthlyMovements: genera comunque i movimenti di entrata ricorrente, indipendenti da paid_by_card", () => {
  const recurringIncome = [
    { description: "Compenso Tessaro", subject: "Jo", monthly_amount: 5500, active: true },
  ];
  const plans = planMonthlyMovements([], recurringIncome, [], "2026-09");
  assert.equal(plans.length, 1);
  assert.equal(plans[0].movement_type, "ENTRATA");
  assert.equal(plans[0].amount, 5500);
});
