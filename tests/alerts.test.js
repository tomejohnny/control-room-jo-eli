import { test } from "node:test";
import assert from "node:assert/strict";
import { getUrgentDeadlines, getNextZeroMarginDeadline } from "../src/lib/alerts.js";

test("getUrgentDeadlines: esclude le scadenze Sospesa (regressione 31/08/2026)", () => {
  const ref = new Date("2026-09-01");
  const deadlines = [
    { title: "F24 Rata 2/5", amount: 2949.58, due_date: "2026-09-16", status: "Sospesa" },
    { title: "Bolletta Enel", amount: 297, due_date: "2026-09-05", status: "Media" },
  ];
  const urgent = getUrgentDeadlines(deadlines, ref);
  assert.equal(urgent.length, 1);
  assert.equal(urgent[0].title, "Bolletta Enel");
});

test("getUrgentDeadlines: include sempre le scadenze status Critico anche oltre i 7 giorni", () => {
  const ref = new Date("2026-09-01");
  const deadlines = [{ title: "Lontana ma critica", amount: 100, due_date: "2026-12-01", status: "Critico" }];
  const urgent = getUrgentDeadlines(deadlines, ref);
  assert.equal(urgent.length, 1);
});

test("getUrgentDeadlines: esclude le scadenze Completato", () => {
  const ref = new Date("2026-09-01");
  const deadlines = [{ title: "Pagata", amount: 100, due_date: "2026-09-02", status: "Completato" }];
  assert.equal(getUrgentDeadlines(deadlines, ref).length, 0);
});

test("getNextZeroMarginDeadline: sceglie la scadenza zero_margin_risk piu' vicina, ignora le altre", () => {
  const deadlines = [
    { title: "Rata 2/16", due_date: "2026-09-30", status: "Media", zero_margin_risk: true },
    { title: "Rata 3/16", due_date: "2026-12-31", status: "Media", zero_margin_risk: true },
    { title: "Bolletta Enel", due_date: "2026-09-05", status: "Media", zero_margin_risk: false },
  ];
  const next = getNextZeroMarginDeadline(deadlines);
  assert.equal(next.title, "Rata 2/16");
});

test("getNextZeroMarginDeadline: null se nessuna scadenza zero_margin_risk e' ancora aperta", () => {
  const deadlines = [
    { title: "Rata pagata", due_date: "2026-03-01", status: "Completato", zero_margin_risk: true },
    { title: "Normale", due_date: "2026-09-05", status: "Media", zero_margin_risk: false },
  ];
  assert.equal(getNextZeroMarginDeadline(deadlines), null);
});
