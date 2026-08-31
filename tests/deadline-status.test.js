import { test } from "node:test";
import assert from "node:assert/strict";
import { isDeadlinePending } from "../src/lib/deadline-status.js";

test("isDeadlinePending: true for a normal open deadline", () => {
  assert.equal(isDeadlinePending({ status: "Critico" }), true);
  assert.equal(isDeadlinePending({ status: "Media" }), true);
  assert.equal(isDeadlinePending({ status: "" }), true);
  assert.equal(isDeadlinePending({}), true);
});

test("isDeadlinePending: false for Completato", () => {
  assert.equal(isDeadlinePending({ status: "Completato" }), false);
});

test("isDeadlinePending: false for Sospesa, both casings used in the data", () => {
  // Regressione 31/08/2026: le rate F24 di Jo sono state trovate con status
  // sia "Sospesa" che "SOSPESA" a seconda di chi le aveva scritte - il
  // criterio deve escludere entrambe.
  assert.equal(isDeadlinePending({ status: "Sospesa" }), false);
  assert.equal(isDeadlinePending({ status: "SOSPESA" }), false);
});
