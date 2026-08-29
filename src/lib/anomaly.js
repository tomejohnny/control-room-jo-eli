// Segnala un'uscita molto piu' alta della media storica della sua categoria -
// utile per beccare un errore di battitura (es. 2.500 invece di 250) prima
// che sballi i saldi. Richiede almeno MIN_SAMPLES precedenti confermati nella
// stessa categoria, altrimenti una categoria nuova risulterebbe sempre "anomala".

const MIN_SAMPLES = 3;
const THRESHOLD = 2;

export function anomalyCheck(movement, allMovements) {
  if (movement.movement_type !== "USCITA" || !movement.category) return null;

  const history = allMovements.filter(m =>
    m.id !== movement.id &&
    m.movement_type === "USCITA" &&
    m.status !== "Previsto" &&
    m.category === movement.category
  );
  if (history.length < MIN_SAMPLES) return null;

  const average = history.reduce((sum, m) => sum + Number(m.amount || 0), 0) / history.length;
  if (average <= 0) return null;

  const amount = Number(movement.amount || 0);
  if (amount < average * THRESHOLD) return null;

  return { average, amount };
}
