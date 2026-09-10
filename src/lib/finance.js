// Formule KPI/Risk/Treasury, derivate interamente dai dati Supabase.
// Le categorie (fixed_expenses.category / deadlines.category) sono testo libero:
// il filtro "contiene 'debito'" o "contiene 'fisco'" e' un'euristica sul dato
// reale attuale, non una regola rigida - va aggiustata se cambia la nomenclatura.

import { investmentStats } from "./investments.js";
import { isDeadlinePending } from "./deadline-status.js";

// I movimenti generati automaticamente (status "Previsto", vedi generate.js)
// non contano nel saldo finche' l'utente non li conferma - altrimenti una
// bozza non ancora rivista altererebbe Saldo Cassa/Margine/DSCR da sola.
export function bankBalance(cashMovements) {
  return cashMovements
    .filter(m => m.status !== "Previsto")
    .reduce((sum, m) => {
      const amount = Number(m.amount || 0);
      return sum + (m.movement_type === "ENTRATA" ? amount : -amount);
    }, 0);
}

// Parole "significative" di una descrizione (accenti rimossi, parole di 2
// caratteri o meno scartate perche' troppo generiche/rumorose per un
// match). Usata solo per il confronto in hasLoggedMovement() sotto.
function normalizeWords(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2);
}

// Vero se OGNI parola significativa della descrizione della spesa fissa
// compare in almeno un movimento del mese - match "ragionevole" (non
// millimetrico) per evitare di contare due volte una spesa fissa gia'
// registrata a mano come cash_movement, anche se descritta con parole
// diverse attorno (es. un bonifico riassuntivo che nomina piu' cose).
// Richiedere TUTTE le parole (non una sola) evita falsi positivi tra due
// spese fisse che condividono una singola parola generica.
function hasLoggedMovement(description, monthMovements) {
  const words = normalizeWords(description);
  if (!words.length) return false;
  return monthMovements.some(m => {
    const text = String(m.description || "").toLowerCase();
    return words.every(w => text.includes(w));
  });
}

// Spese Fisso Certo che usciranno davvero dal conto questo mese e non sono
// ancora ne' pagate con carta (gia' nella liquidazione ciclo carta, vedi
// deadlines categoria "Carta di Credito" - contarle anche qui sarebbe doppio
// conteggio, come CapCut corretto il 09/09/2026) ne' gia' registrate a mano
// come cash_movement del mese.
export function unpaidFixedExpensesThisMonth(fixedExpenses, cashMovements, ref = new Date()) {
  const monthMovements = cashMovements.filter(m => sameMonth(m.movement_date, ref));
  return fixedExpenses.filter(f =>
    f.active !== false &&
    !f.paid_by_card &&
    !hasLoggedMovement(f.description, monthMovements)
  );
}

// Margine Fine Mese = cassa reale che uscira' dal conto entro fine mese -
// include le spese Fisso Certo residue, non solo le scadenze (bug
// segnalato da Jo il 10/09/2026: senza le spese fisse il margine risultava
// sistematicamente troppo ottimista, in un caso reale di oltre 3.283 euro,
// nascondendo rischi di sforamento veri). Deliberatamente NON mensilizzato
// per frequenza (a differenza di monthlyEquivalentAmount/
// totalMonthlyFixedExpenses sotto, corrette per il Master Budget/
// pianificazione ma non per la cassa reale di questo mese): una voce
// Bimestrale/Trimestrale/... non ha un campo che dica in quale mese cade
// la fattura, quindi si usa l'importo pieno come stima prudenziale in ogni
// mese - meglio sovrastimare l'uscita che rischiare di ometterla nel mese
// sbagliato. hasProvisionalEstimate segnala quando questo e' il caso, per
// mostrare la nota in UI.
export function monthEndMarginDetail(cashMovements, deadlines, fixedExpenses, ref = new Date()) {
  const balance = bankBalance(cashMovements);
  const pendingDeadlines = deadlines
    .filter(d => isDeadlinePending(d) && sameMonth(d.due_date, ref))
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const unpaidFixedExpenses = unpaidFixedExpensesThisMonth(fixedExpenses, cashMovements, ref);
  const pendingFixedExpenses = unpaidFixedExpenses.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const hasProvisionalEstimate = unpaidFixedExpenses.some(f => f.frequency && f.frequency !== "Mensile");
  return {
    margin: balance - pendingDeadlines - pendingFixedExpenses,
    pendingFixedExpenses,
    hasProvisionalEstimate,
  };
}

export function monthEndMargin(cashMovements, deadlines, fixedExpenses, ref = new Date()) {
  return monthEndMarginDetail(cashMovements, deadlines, fixedExpenses, ref).margin;
}

// Fido di cassa: linea di credito storica sul conto corrente, senza
// scadenza (dato reale della banca, non ricavabile da Supabase - vedi
// richiesta di Jo del 09/09/2026). Costante applicativa, non una colonna:
// se l'importo cambiasse in futuro va aggiornato solo qui.
//
// bankBalance()/monthEndMargin() sopra restituiscono gia' il saldo
// DISPONIBILE (include il fido, cosi' come lo mostra la banca) - le tre
// funzioni sotto derivano da quello il saldo CONTABILE (quanto c'e' davvero
// sul conto) e quanto fido si sta usando, senza toccare nessun dato salvato.
export const FIDO_CASSA = 4000;

export function saldoContabile(saldoDisponibile) {
  return saldoDisponibile - FIDO_CASSA;
}

// Quanto fido e' in uso ora: 0 se il saldo disponibile copre o supera il
// fido pieno (fido non toccato), fino a FIDO_CASSA quando il saldo
// disponibile arriva a 0 (fido tutto utilizzato, saldo contabile a
// -FIDO_CASSA). Ha senso solo per saldo disponibile >= 0: sotto zero si e'
// gia' in sforamento, vedi fidoSforamento().
export function fidoUtilizzato(saldoDisponibile) {
  return Math.max(0, FIDO_CASSA - saldoDisponibile);
}

// Sforamento: si verifica SOLO quando il saldo disponibile scende sotto
// zero - a quel punto l'intero fido e' gia' superato, non ne resta una
// parte (mai la dicitura "fido residuo" in questo caso). null se non c'e'
// sforamento.
export function fidoSforamento(saldoDisponibile) {
  return saldoDisponibile < 0 ? Math.abs(saldoDisponibile) : null;
}

// Le voci Fisso Certo mostrano l'importo reale della bolletta/rata cosi'
// come arriva (es. EOLO 59,80€ Bimestrale), ma un totale MENSILE deve
// contarle per il loro equivalente mensile, non per l'importo pieno - altrimenti
// una voce bimestrale pesa il doppio del dovuto sul totale del mese (bug
// segnalato da Jo il 04/09/2026 su EOLO: 59,80€ invece di 29,90€/mese).
// Le frequenze non riconosciute (o "Mensile") restano invariate.
const FREQUENCY_DIVISORS = {
  Mensile: 1,
  Bimestrale: 2,
  Trimestrale: 3,
  Semestrale: 6,
  Annuale: 12,
};

export function monthlyEquivalentAmount(amount, frequency) {
  const divisor = FREQUENCY_DIVISORS[frequency] || 1;
  return Number(amount || 0) / divisor;
}

export function totalMonthlyFixedExpenses(fixedExpenses) {
  return fixedExpenses.filter(f => f.active !== false).reduce((sum, f) => sum + monthlyEquivalentAmount(f.amount, f.frequency), 0);
}

export function totalMonthlyIncome(recurringIncome) {
  return recurringIncome.filter(i => i.active !== false).reduce((sum, i) => sum + Number(i.monthly_amount || 0), 0);
}

export function liquidityMonths(cashMovements, fixedExpenses) {
  const burn = totalMonthlyFixedExpenses(fixedExpenses);
  if (burn <= 0) return null;
  return bankBalance(cashMovements) / burn;
}

export function dscr(recurringIncome, fixedExpenses) {
  const debtService = fixedExpenses
    .filter(f => f.active !== false && String(f.category || "").toLowerCase().includes("debito"))
    .reduce((sum, f) => sum + monthlyEquivalentAmount(f.amount, f.frequency), 0);
  if (debtService <= 0) return null;
  return totalMonthlyIncome(recurringIncome) / debtService;
}

// Patrimonio Netto = liquidita' + valore attuale investimenti - capitale
// residuo dei debiti (fixed_expenses.remaining_balance, aggiornato a mano
// occasionalmente da chi gestisce l'app - vedi supabase/add_remaining_balance.sql).
// Senza quel campo compilato il debito corrispondente semplicemente non
// viene sottratto: e' un patrimonio netto "per quanto se ne sa", non un
// numero fasullo per le voci non aggiornate.
export function netWorth(cashMovements, fixedExpenses, investments, investmentTransactions) {
  const liquidity = bankBalance(cashMovements);
  const investmentsValue = investments.reduce((sum, inv) => sum + investmentStats(inv, investmentTransactions).currentValue, 0);
  const debt = fixedExpenses.reduce((sum, f) => sum + Number(f.remaining_balance || 0), 0);
  return liquidity + investmentsValue - debt;
}

// Quota di entrate mensili non consumata dalle spese fisse mensili.
export function savingsRate(recurringIncome, fixedExpenses) {
  const income = totalMonthlyIncome(recurringIncome);
  if (income <= 0) return null;
  return 1 - totalMonthlyFixedExpenses(fixedExpenses) / income;
}

export function quarterlyTreasury(recurringIncome, fixedExpenses, deadlines, quarters = 4, ref = new Date()) {
  const monthlyIncome = totalMonthlyIncome(recurringIncome);
  const monthlyExpense = totalMonthlyFixedExpenses(fixedExpenses);
  const result = [];
  for (let q = 0; q < quarters; q++) {
    const startMonth = ref.getMonth() + q * 3;
    const start = new Date(ref.getFullYear(), startMonth, 1);
    const end = new Date(ref.getFullYear(), startMonth + 3, 0);
    const oneOff = deadlines
      .filter(d => isDeadlinePending(d) && inRange(d.due_date, start, end))
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const income = monthlyIncome * 3;
    const expense = monthlyExpense * 3 + oneOff;
    result.push({
      label: quarterLabel(start, end),
      income,
      expense,
      net: income - expense,
    });
  }
  return result;
}

function sameMonth(dateStr, ref) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function quarterLabel(start, end) {
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${months[start.getMonth()]} - ${months[end.getMonth()]} ${end.getFullYear()}`;
}