import { cardCycle } from "./creditcard.js";

// Raggruppa i movimenti carta (card_transactions) di una persona per ciclo
// (29 del mese - 28 del successivo), a partire dal ciclo che contiene "ref"
// (di norma oggi, quindi il ciclo aperto) e andando indietro nel tempo.
// Le righe excluded_from_cycle=true (Klarna, CapCut - gia' tracciate come
// scadenze a parte in "deadlines") restano nell'elenco per completezza ma
// non entrano nel totale ne' nel breakdown per categoria, per non contare
// due volte la stessa spesa - stessa regola gia' applicata a mano nelle
// note delle scadenze carta.
export function groupTransactionsByCycle(transactions, person, ref = new Date(), cycles = 3) {
  const groups = [];
  let anchor = new Date(ref);

  for (let i = 0; i < cycles; i++) {
    const { cycleStart, cycleEnd, settlementDate } = cardCycle(anchor);
    const rows = transactions
      .filter(t => t.person === person)
      .filter(t => {
        if (!t.purchase_date) return false;
        const d = new Date(t.purchase_date);
        return d >= cycleStart && d <= cycleEnd;
      })
      .sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : a.purchase_date > b.purchase_date ? -1 : 0));

    const included = rows.filter(t => !t.excluded_from_cycle);
    const total = included.reduce((s, t) => s + Number(t.amount || 0) + Number(t.fees || 0), 0);

    const byCategory = {};
    included.forEach(t => {
      const cat = t.category || "Non categorizzato";
      byCategory[cat] = (byCategory[cat] || 0) + Number(t.amount || 0) + Number(t.fees || 0);
    });

    groups.push({ cycleStart, cycleEnd, settlementDate, rows, total, byCategory, isOpen: i === 0 });

    // Ciclo precedente: un giorno prima dell'inizio di questo, cosi'
    // cardCycle() lo fa ripartire correttamente indietro nel tempo.
    anchor = new Date(cycleStart);
    anchor.setDate(anchor.getDate() - 1);
  }

  return groups;
}
