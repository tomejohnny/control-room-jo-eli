import { test } from "node:test";
import assert from "node:assert/strict";
import { guessCategory } from "../src/lib/cardcategories.js";

test("guessCategory: riconosce un esercente noto (spesa alimentare) indipendentemente da codice POS/citta'", () => {
  const g = guessCategory("LIDL 1263 SACILE ITA");
  assert.deepEqual(g, { category: "Spesa", excluded: false });
});

test("guessCategory: e' case-insensitive", () => {
  const g = guessCategory("lidl 1235 vittorio vene ita");
  assert.deepEqual(g, { category: "Spesa", excluded: false });
});

test("guessCategory: Klarna suggerisce anche escluso dal ciclo (gia' tracciato come scadenza a parte)", () => {
  const g = guessCategory("Klarna* pagoPA Paris FRA");
  assert.deepEqual(g, { category: "Klarna (tracciato altrove)", excluded: true });
});

test("guessCategory: CapCut suggerisce anche escluso dal ciclo", () => {
  const g = guessCategory("PAYPAL *CAPCUT 4029357733 IRL");
  assert.deepEqual(g, { category: "Abbonamento (tracciato altrove)", excluded: true });
});

test("guessCategory: Mooney (bollettini/pagoPA) va sotto Utenze, non escluso dal ciclo", () => {
  const g = guessCategory("PAYPAL *MOONEY Milano ITA");
  assert.deepEqual(g, { category: "Utenze", excluded: false });
});

test("guessCategory: un esercente mai visto prima non produce alcun suggerimento", () => {
  assert.equal(guessCategory("ESERCENTE SCONOSCIUTO XYZ ITA"), null);
});

test("guessCategory: descrizione vuota o assente non produce alcun suggerimento", () => {
  assert.equal(guessCategory(""), null);
  assert.equal(guessCategory(null), null);
  assert.equal(guessCategory(undefined), null);
});
