// Confronto Stimato (budgets, tier "Variabile Stimato") vs Consuntivo reale,
// calcolato al volo dai movimenti carta - non un valore salvato a mano
// (budgets.actual_amount esiste nello schema ma non e' usato qui: e' quello
// che alimenta un'altra sezione, l'Accantonamento Mensilizzato, e resta
// sempre 0 finche' nessuno lo popola manualmente - vedi lib/analysis.js).
//
// Match per categoria esatta (stessa tassonomia canonica di categories.js,
// unificata da Jo il 04/09/2026) + mese del purchase_date. Escluse le righe
// excluded_from_cycle=true (spese rimborsate da terzi, gia' tracciate/
// compensate altrove - non impattano il bilancio familiare) e quelle con
// categoria "Da categorizzare" o assente (non ancora affidabili per un
// confronto per categoria).
export function variabileStimatoConsuntivo(budgetRows, cardTransactions, month) {
  return budgetRows.map(b => {
    const consuntivo = cardTransactions
      .filter(t => !t.excluded_from_cycle)
      .filter(t => t.category && t.category !== "Da categorizzare")
      .filter(t => t.category === b.category)
      .filter(t => String(t.purchase_date || "").startsWith(month))
      .reduce((sum, t) => sum + Number(t.amount || 0) + Number(t.fees || 0), 0);
    const stimato = Number(b.planned_amount || 0);
    const scostamento = consuntivo - stimato;
    const scostamentoPct = stimato > 0 ? (scostamento / stimato) * 100 : null;
    return { ...b, stimato, consuntivo, scostamento, scostamentoPct };
  });
}
