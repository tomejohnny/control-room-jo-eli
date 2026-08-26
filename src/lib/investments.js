// Convenzione condivisa: se un investimento ha versamenti tracciati in
// investment_transactions, investments.current_value rappresenta il prezzo
// per quota (aggiornato via ticker o a mano) e il valore totale si calcola
// come quote_totali x prezzo. Senza versamenti tracciati, current_value resta
// il valore totale della posizione inserito manualmente (comportamento storico).

export function investmentStats(investment, investmentTransactions) {
  const txs = investmentTransactions
    .filter(t => t.investment_id === investment.id)
    .sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));

  if (!txs.length) {
    return {
      hasUnits: false,
      units: 0,
      invested: 0,
      currentValue: Number(investment.current_value || 0),
      points: [],
    };
  }

  const units = txs.reduce((s, t) => s + Number(t.units || 0), 0);
  const invested = txs.reduce((s, t) => s + Number(t.amount || 0), 0);
  const currentValue = units * Number(investment.current_value || 0);

  let cumulative = 0;
  const points = txs.map(t => {
    cumulative += Number(t.amount || 0);
    return { x: t.transaction_date, y: cumulative };
  });

  return { hasUnits: true, units, invested, currentValue, points };
}
