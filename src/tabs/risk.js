import { getState } from "../lib/store.js";
import { liquidityMonths, dscr, bankBalance } from "../lib/finance.js";
import { money, escapeHtml } from "../lib/format.js";
import { isDeadlinePending } from "../lib/deadline-status.js";
import { cardPlafondStatus } from "../lib/creditcard.js";

// Plafond carta di credito: 1.500 euro a testa, per ciclo (29 del mese -
// 28 del mese successivo). Serve soprattutto a Eli, che non ha un'app della
// banca per controllare la propria carta (il conto e' cointestato ma
// l'app e' abbinata a una sola persona, e ce l'ha Jo) - qui puo' vedere
// quanto le resta senza doverlo chiedere.
const CARD_PLAFOND = 1500;
const CARDHOLDERS = ["Jo", "Eli"];

function plafondColor(remaining, plafond) {
  const pct = remaining / plafond;
  if (pct >= 0.5) return "text-green";
  if (pct >= 0.2) return "text-amber";
  return "text-red";
}

export function render() {
  const { cashMovements, fixedExpenses, recurringIncome, deadlines } = getState();

  const months = liquidityMonths(cashMovements, fixedExpenses);
  const dscrValue = dscr(recurringIncome, fixedExpenses);
  const balance = bankBalance(cashMovements);

  // Nota: qui NON si esclude "Sospesa" di proposito - questo e' il totale dei
  // debiti/impegni residui (quanto si deve ancora, punto), non la pressione
  // di cassa attesa questo ciclo (che e' invece cio' che isDeadlinePending
  // filtra altrove) - una rata congelata resta comunque un debito residuo.
  const shortTermDebts = deadlines.filter(d =>
    d.status !== "Completato" && String(d.category || "").toLowerCase().includes("debito")
  );
  const shortTermTotal = shortTermDebts.reduce((s, d) => s + Number(d.amount || 0), 0);

  // Stesso criterio isDeadlinePending usato in alerts.js e finance.js: le
  // scadenze "Sospesa" sono congelate di proposito (es. le rate F24 di Jo) e
  // non vanno mostrate come "alta priorità" ogni giorno. In piu': una
  // scadenza zero_margin_risk (es. Accertamento con Adesione di Elisa) va
  // sempre inclusa qui indipendentemente dal campo priority - e' il criterio
  // di rischio reale (decadenza dell'intero piano), non un'etichetta
  // impostata a mano che puo' non essere aggiornata.
  const critical = deadlines.filter(d =>
    isDeadlinePending(d) &&
    (d.status === "Critico" || d.priority === "Critica" || d.priority === "Alta" || d.zero_margin_risk)
  );

  const plafondStatuses = CARDHOLDERS.map(person => ({
    person,
    ...cardPlafondStatus(deadlines, person, CARD_PLAFOND),
  }));
  const cycleLabel = plafondStatuses.length
    ? `${plafondStatuses[0].cycleStart.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} - ${plafondStatuses[0].cycleEnd.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`
    : "";

  const container = document.getElementById("risk-container");
  container.innerHTML = `
    <table class="desktop-table">
      <tr><td>Riserva di Liquidità  (Saldo Cassa / Spese Fisse Mensili)</td><td class="amount ${months == null ? "" : months >= 3 ? "text-green" : "text-red"}" style="text-align:right">${months == null ? "n/d" : months.toFixed(1) + " Mesi"}</td></tr>
      <tr><td>Covenant Status (DSCR = Entrate Mensili / Rate Debito)</td><td class="amount ${dscrValue == null ? "" : dscrValue >= 1 ? "text-green" : "text-red"}" style="text-align:right">${dscrValue == null ? "n/d" : (dscrValue >= 1 ? "COMPLIANT " : "NON COMPLIANT ") + "(" + dscrValue.toFixed(2) + "x)"}</td></tr>
      <tr><td>Debiti/Impegni a Breve Termine Residui</td><td class="amount text-red" style="text-align:right">${money(shortTermTotal)}</td></tr>
      <tr><td>Saldo Cassa Attuale</td><td class="amount" style="text-align:right">${money(balance)}</td></tr>
    </table>
    <div class="mobile-cards-container">
      <div class="m-card"><div class="m-card-header"><span class="m-card-title">Riserva di Liquidità </span><span class="m-card-amount ${months == null ? "" : months >= 3 ? "text-green" : "text-red"}">${months == null ? "n/d" : months.toFixed(1) + " Mesi"}</span></div></div>
      <div class="m-card"><div class="m-card-header"><span class="m-card-title">Covenant Status (DSCR)</span><span class="m-card-amount ${dscrValue == null ? "" : dscrValue >= 1 ? "text-green" : "text-red"}">${dscrValue == null ? "n/d" : dscrValue.toFixed(2) + "x"}</span></div></div>
      <div class="m-card"><div class="m-card-header"><span class="m-card-title">Debiti a Breve Residui</span><span class="m-card-amount text-red">${money(shortTermTotal)}</span></div></div>
    </div>
    ${critical.length ? `
      <h3 style="font-size:0.85rem;margin:16px 0 8px;color:var(--text-muted)">Scadenze ad alta priorità  non completate</h3>
      <div class="mobile-cards-container" style="display:flex">
        ${critical.map(d => `<div class="m-card"><div class="m-card-header"><span class="m-card-title">${escapeHtml(d.title)}</span><span class="m-card-amount text-red">${money(d.amount)}</span></div><div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(d.due_date)} - ${escapeHtml(d.status)}</div></div>`).join("")}
      </div>` : ""}

    <h3 style="font-size:0.85rem;margin:16px 0 8px;color:var(--text-muted)">Plafond Carta di Credito - ciclo ${escapeHtml(cycleLabel)}</h3>
    <table class="desktop-table">
      ${plafondStatuses.map(p => `<tr><td>${escapeHtml(p.person)} - Disponibile</td><td class="amount ${plafondColor(p.remaining, p.plafond)}" style="text-align:right">${money(p.remaining)} <span style="color:var(--text-muted);font-weight:400">di ${money(p.plafond)}</span></td></tr>`).join("")}
    </table>
    <div class="mobile-cards-container" style="display:flex">
      ${plafondStatuses.map(p => `<div class="m-card"><div class="m-card-header"><span class="m-card-title">${escapeHtml(p.person)}</span><span class="m-card-amount ${plafondColor(p.remaining, p.plafond)}">${money(p.remaining)}</span></div><div style="font-size:0.75rem;color:var(--text-muted)">Usati ${money(p.used)} di ${money(p.plafond)}</div></div>`).join("")}
    </div>
    <p class="hint">Aggiornato in base alle spese carta registrate in Control Room - se non hai ancora mandato le ultime spese, il numero qui puo' essere piu' alto di quello reale.</p>
  `;
}