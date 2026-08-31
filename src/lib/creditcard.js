// Le carte di credito di Jo ed Elisa funzionano "a saldo", non revolving: il
// plafond (1.500 euro ciascuna) si azzera e riparte pieno ad ogni ciclo. Il
// ciclo va dal 29 del mese al 28 del mese successivo, e la liquidazione (i
// soldi escono davvero dal conto corrente) avviene il 18 del mese ancora
// successivo alla chiusura del ciclo. Regola gia' documentata a mano nelle
// note delle scadenze carta (es. Bolletta Enel pagata il 31/08/2026); qui
// diventa una funzione unica cosi' non va ricalcolata ogni volta e non puo'
// disallinearsi da un caso all'altro.

export function cardCycle(date = new Date()) {
  const d = new Date(date);
  const day = d.getDate();
  // Se siamo nella "coda" del mese (29-31), il ciclo aperto e' iniziato
  // questo mese; altrimenti (1-28) e' iniziato il mese precedente.
  let cycleStartMonth = day >= 29 ? d.getMonth() : d.getMonth() - 1;
  const cycleStartYear = d.getFullYear();

  const cycleStart = new Date(cycleStartYear, cycleStartMonth, 29);
  const cycleEnd = new Date(cycleStartYear, cycleStartMonth + 1, 28);
  const settlementDate = new Date(cycleStartYear, cycleStartMonth + 2, 18);
  return { cycleStart, cycleEnd, settlementDate };
}

function inCycle(dateStr, cycleStart, cycleEnd) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= cycleStart && d <= cycleEnd;
}

// Quanto del plafond di "subject" (Jo / Elisa) e' gia' stato speso nel ciclo
// attualmente aperto (quello che contiene "ref", di norma oggi), e quanto
// resta. Legge le scadenze category="Carta di Credito" di quella persona con
// purchase_date valorizzata - le uniche che consumano plafond.
export function cardPlafondStatus(deadlines, subject, plafond, ref = new Date()) {
  const { cycleStart, cycleEnd, settlementDate } = cardCycle(ref);
  const used = deadlines
    .filter(d => d.category === "Carta di Credito" && d.subject === subject)
    .filter(d => inCycle(d.purchase_date, cycleStart, cycleEnd))
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  return { used, remaining: plafond - used, plafond, cycleStart, cycleEnd, settlementDate };
}
