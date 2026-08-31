import { test } from "node:test";
import assert from "node:assert/strict";
import { cardCycle, cardPlafondStatus } from "../src/lib/creditcard.js";

test("cardCycle: una data nella coda del mese (29-31) apre il ciclo dello stesso mese", () => {
  // Caso reale verificato a mano il 31/08/2026: spesa Enel del 31/08 rientra
  // nel ciclo 29/08-28/09, liquidazione 18/10/2026.
  const { cycleStart, cycleEnd, settlementDate } = cardCycle(new Date(2026, 7, 31)); // 31 agosto 2026
  assert.equal(cycleStart.toISOString().slice(0, 10), "2026-08-29");
  assert.equal(cycleEnd.toISOString().slice(0, 10), "2026-09-28");
  assert.equal(settlementDate.toISOString().slice(0, 10), "2026-10-18");
});

test("cardCycle: una data a inizio/meta' mese (1-28) appartiene al ciclo aperto il mese precedente", () => {
  const { cycleStart, cycleEnd, settlementDate } = cardCycle(new Date(2026, 8, 15)); // 15 settembre 2026
  assert.equal(cycleStart.toISOString().slice(0, 10), "2026-08-29");
  assert.equal(cycleEnd.toISOString().slice(0, 10), "2026-09-28");
  assert.equal(settlementDate.toISOString().slice(0, 10), "2026-10-18");
});

test("cardCycle: il 28 stesso e' l'ultimo giorno del ciclo che si sta per chiudere, non il primo del prossimo", () => {
  const { cycleStart, cycleEnd } = cardCycle(new Date(2026, 8, 28)); // 28 settembre 2026
  assert.equal(cycleStart.toISOString().slice(0, 10), "2026-08-29");
  assert.equal(cycleEnd.toISOString().slice(0, 10), "2026-09-28");
});

test("cardCycle: il 29 e' gia' il primo giorno del ciclo successivo", () => {
  const { cycleStart, cycleEnd } = cardCycle(new Date(2026, 8, 29)); // 29 settembre 2026
  assert.equal(cycleStart.toISOString().slice(0, 10), "2026-09-29");
  assert.equal(cycleEnd.toISOString().slice(0, 10), "2026-10-28");
});

test("cardCycle: rollover di fine anno (dicembre -> gennaio) corretto", () => {
  const { cycleStart, cycleEnd, settlementDate } = cardCycle(new Date(2026, 11, 15)); // 15 dicembre 2026
  assert.equal(cycleStart.toISOString().slice(0, 10), "2026-11-29");
  assert.equal(cycleEnd.toISOString().slice(0, 10), "2026-12-28");
  assert.equal(settlementDate.toISOString().slice(0, 10), "2027-01-18");
});

test("cardPlafondStatus: somma solo le spese carta della persona giusta nel ciclo aperto", () => {
  const ref = new Date(2026, 7, 31); // 31 agosto 2026 -> ciclo 29/08-28/09
  const deadlines = [
    { category: "Carta di Credito", subject: "Jo", amount: 297, purchase_date: "2026-08-31" }, // dentro
    { category: "Carta di Credito", subject: "Jo", amount: 50, purchase_date: "2026-09-10" }, // dentro
    { category: "Carta di Credito", subject: "Jo", amount: 999, purchase_date: "2026-08-20" }, // fuori (ciclo precedente)
    { category: "Carta di Credito", subject: "Elisa", amount: 80, purchase_date: "2026-09-05" }, // persona diversa
    { category: "Debito / Klarna", subject: "Jo", amount: 141.65, purchase_date: "2026-09-01" }, // categoria diversa
  ];
  const status = cardPlafondStatus(deadlines, "Jo", 1500, ref);
  assert.equal(status.used, 347);
  assert.equal(status.remaining, 1153);
});

test("cardPlafondStatus: ignora le righe carta senza purchase_date valorizzata", () => {
  const ref = new Date(2026, 7, 31);
  const deadlines = [{ category: "Carta di Credito", subject: "Jo", amount: 500, purchase_date: null }];
  const status = cardPlafondStatus(deadlines, "Jo", 1500, ref);
  assert.equal(status.used, 0);
  assert.equal(status.remaining, 1500);
});
