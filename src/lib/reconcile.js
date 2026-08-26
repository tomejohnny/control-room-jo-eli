// Trova un movimento di cassa che sembra corrispondere a una scadenza ancora
// aperta, per suggerire (mai imporre) di segnarla come Completata.
// Match: stesso importo (+/- 1 centesimo), USCITA, data entro 15 giorni dalla
// scadenza, descrizioni corrispondenti dopo normalizzazione.

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function daysBetween(a, b) {
  const ms = Math.abs(new Date(a) - new Date(b));
  return ms / (1000 * 60 * 60 * 24);
}

export function findMatch(deadline, cashMovements) {
  const amount = Number(deadline.amount || 0);
  if (amount <= 0 || !deadline.due_date) return null;

  const deadlineText = normalize(deadline.title);

  return cashMovements.find(m => {
    if (m.movement_type !== "USCITA") return false;
    if (Math.abs(Number(m.amount || 0) - amount) > 0.01) return false;
    if (!m.movement_date || daysBetween(m.movement_date, deadline.due_date) > 15) return false;
    const moveText = normalize(m.description);
    return moveText === deadlineText || moveText.includes(deadlineText) || deadlineText.includes(moveText);
  }) || null;
}
