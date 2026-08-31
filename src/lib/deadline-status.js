// Criterio unico e condiviso di "scadenza ancora da considerare per la cassa
// e per le urgenze": esclude sia le scadenze gia' Completato sia quelle
// Sospesa (congelate di proposito, es. le rate F24 di Jo - il debito resta
// reale ma per scelta non viene versato in questo ciclo, quindi non deve
// gonfiare la pressione mostrata a chi guarda l'app).
//
// Prima del 31/08/2026 questa stessa regola viveva come tre copie quasi
// identiche in alerts.js (getUrgentDeadlines), finance.js (monthEndMargin,
// quarterlyTreasury) e risk.js (pannello priorita' alta) - copie che si erano
// gia' disallineate una volta lo stesso giorno (risk.js e finance.js sono
// stati corretti separatamente, in momenti diversi, perche' nessuno dei due
// importava dall'altro). Centralizzata qui una volta per tutte: chi la
// importa non puo' piu' dimenticare un'esclusione che gli altri gia' hanno.
export function isDeadlinePending(d) {
  return d.status !== "Completato" && d.status !== "Sospesa" && d.status !== "SOSPESA";
}
