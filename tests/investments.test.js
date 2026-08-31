import { test } from "node:test";
import assert from "node:assert/strict";
import { investmentStats } from "../src/lib/investments.js";

test("investmentStats: un fondo con ticker e zero versamenti vale 0 (regressione Patrimonio Netto)", () => {
  // Bug reale trovato in produzione: current_value per un fondo con ticker e'
  // il prezzo per quota (aggiornato da Refresh Live/Modifica Manuale), non il
  // valore della posizione - senza versamenti la posizione vale zero, non il
  // prezzo per quota "nudo".
  const investment = { id: 1, ticker: "VWCE.DE", current_value: 168.54 };
  const stats = investmentStats(investment, []);
  assert.equal(stats.hasUnits, false);
  assert.equal(stats.currentValue, 0);
});

test("investmentStats: un investimento SENZA ticker e zero versamenti usa current_value come valore manuale storico", () => {
  const investment = { id: 5, ticker: null, current_value: 5000 };
  const stats = investmentStats(investment, []);
  assert.equal(stats.currentValue, 5000);
});

test("investmentStats: con versamenti tracciati, il valore e' quote totali x prezzo corrente", () => {
  const investment = { id: 1, ticker: "VWCE.DE", current_value: 168.54 };
  const txs = [
    { investment_id: 1, amount: 400, units: 2.5, transaction_date: "2026-08-01" },
    { investment_id: 2, amount: 999, units: 999, transaction_date: "2026-08-01" }, // altro investimento, deve essere ignorato
  ];
  const stats = investmentStats(investment, txs);
  assert.equal(stats.hasUnits, true);
  assert.equal(stats.units, 2.5);
  assert.equal(stats.invested, 400);
  assert.equal(stats.currentValue, 2.5 * 168.54);
});
