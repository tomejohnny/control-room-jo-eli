import { test } from "node:test";
import assert from "node:assert/strict";
import { groupTransactionsByCycle } from "../src/lib/cardtransactions.js";

test("groupTransactionsByCycle: divide i movimenti nel ciclo aperto e in quello chiuso", () => {
  const ref = new Date(2026, 7, 31); // 31 agosto 2026 -> ciclo aperto 29/08-28/09
  const transactions = [
    { person: "Jo", purchase_date: "2026-08-30", description: "A", amount: 50, fees: 0, category: "Spesa", excluded_from_cycle: false },
    { person: "Jo", purchase_date: "2026-08-19", description: "B", amount: 30, fees: 2, category: "Spesa", excluded_from_cycle: false },
    { person: "Jo", purchase_date: "2026-07-15", description: "Fuori range", amount: 999, fees: 0, category: "Spesa", excluded_from_cycle: false },
    { person: "Eli", purchase_date: "2026-08-30", description: "Non di Jo", amount: 10, fees: 0, category: "Spesa", excluded_from_cycle: false },
  ];
  const groups = groupTransactionsByCycle(transactions, "Jo", ref, 2);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].isOpen, true);
  assert.equal(groups[0].cycleStart.toISOString().slice(0, 10), "2026-08-29");
  assert.equal(groups[0].rows.length, 1);
  assert.equal(groups[0].total, 50);
  assert.equal(groups[1].isOpen, false);
  assert.equal(groups[1].cycleStart.toISOString().slice(0, 10), "2026-07-29");
  assert.equal(groups[1].rows.length, 1);
  assert.equal(groups[1].total, 32);
});

test("groupTransactionsByCycle: le righe escluse (Klarna/CapCut) restano nell'elenco ma non nel totale ne' nel breakdown categoria", () => {
  const ref = new Date(2026, 7, 31);
  const transactions = [
    { person: "Jo", purchase_date: "2026-08-30", description: "Spesa normale", amount: 50, fees: 0, category: "Spesa", excluded_from_cycle: false },
    { person: "Jo", purchase_date: "2026-08-30", description: "Klarna* pagoPA", amount: 79.14, fees: 0, category: "Klarna (tracciato altrove)", excluded_from_cycle: true },
  ];
  const groups = groupTransactionsByCycle(transactions, "Jo", ref, 1);
  assert.equal(groups[0].rows.length, 2, "entrambe le righe restano visibili");
  assert.equal(groups[0].total, 50, "il totale non include la riga esclusa");
  assert.deepEqual(groups[0].byCategory, { Spesa: 50 });
});

test("groupTransactionsByCycle: il breakdown per categoria somma correttamente piu' righe della stessa categoria", () => {
  const ref = new Date(2026, 7, 31);
  const transactions = [
    { person: "Jo", purchase_date: "2026-09-05", description: "Prelievo 1", amount: 100, fees: 4, category: "Prelievo Bancomat", excluded_from_cycle: false },
    { person: "Jo", purchase_date: "2026-09-19", description: "Prelievo 2", amount: 100, fees: 4, category: "Prelievo Bancomat", excluded_from_cycle: false },
    { person: "Jo", purchase_date: "2026-09-20", description: "Sky", amount: 27.24, fees: 0, category: "Abbonamento", excluded_from_cycle: false },
  ];
  const groups = groupTransactionsByCycle(transactions, "Jo", ref, 1);
  assert.equal(groups[0].byCategory["Prelievo Bancomat"], 208);
  assert.equal(groups[0].byCategory["Abbonamento"], 27.24);
});

test("groupTransactionsByCycle: le righe senza purchase_date vengono ignorate senza far fallire il raggruppamento", () => {
  const ref = new Date(2026, 7, 31);
  const transactions = [
    { person: "Jo", purchase_date: null, description: "Senza data", amount: 10, fees: 0, category: null, excluded_from_cycle: false },
  ];
  const groups = groupTransactionsByCycle(transactions, "Jo", ref, 1);
  assert.equal(groups[0].rows.length, 0);
  assert.equal(groups[0].total, 0);
});
