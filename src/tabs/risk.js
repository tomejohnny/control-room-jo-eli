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

// Stessa soglia di plafondColor, ma come modificatore per la barretta
// colorata a sinistra della kpi-card (vedi styles.css: .kpi-card.green/.amber/.red)
function plafondTileClass(remaining, plafond) {
  const pct = remaining / plafond;
  if (pct >= 0.5) return "green";
  if (pct >= 0.2) return "amber";
  return "red";
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

  // Le carte vanno per prime: sono il dato che Jo ed Eli controllano piu'
  // spesso (soprattutto Eli, che non ha l'app della banca) e su schermi
  // larghi restavano in fondo alla pagina dentro una tabella stretta a due
  // colonne che lasciava mezzo schermo vuoto a destra. Qui e piu' sotto si
  // riusano le kpi-card gia' definite in styles.css (stesse della barra in
  // cima a ogni pagina): sono un grid responsive che si allarga da solo
  // invece di una tabella a larghezza fissa.
  const container = document.getElementById("risk-container");
  container.innerHTML = `
    <h3 style="font-size:0.85rem;margin:0 0 10px;color:var(--text-muted)">Plafond Carta di Credito - ciclo ${escapeHtml(cycleLabel)}</h3>
    <div class="grid-kpi" style="margin-bottom:6px">
      ${plafondStatuses.map(p => `
        <div class="kpi-card ${plafondTileClass(p.remaining, p.plafond)}">
          <div class="kpi-title">${escapeHtml(p.person)} - Disponibile</div>
          <div class="kpi-value ${plafondColor(p.remaining, p.plafond)}">${money(p.remaining)}</div>
          <div class="kpi-sub">Usati ${money(p.used)} di ${money(p.plafond)}</div>
        </div>`).join("")}
    </div>
    <p class="hint" style="margin-bottom:24px">Aggiornato in base alle spese carta registrate in Control Room - se non hai ancora mandato le ultime spese, il numero qui puo' essere piu' alto di quello reale.</p>

    <h3 style="font-size:0.85rem;margin:0 0 10px;color:var(--text-muted)">Liquidità e Copertura Debiti</h3>
    <div class="grid-kpi">
      <div class="kpi-card ${months == null ? "" : months >= 3 ? "green" : "red"}">
        <div class="kpi-title">Riserva di Liquidità</div>
        <div class="kpi-value ${months == null ? "" : months >= 3 ? "text-green" : "text-red"}">${months == null ? "n/d" : months.toFixed(1) + " Mesi"}</div>
        <div class="kpi-sub">Saldo Cassa / Spese Fisse Mensili</div>
      </div>
      <div class="kpi-card ${dscrValue == null ? "" : dscrValue >= 1 ? "green" : "red"}">
        <div class="kpi-title">Covenant Status (DSCR)</div>
        <div class="kpi-value ${dscrValue == null ? "" : dscrValue >= 1 ? "text-green" : "text-red"}">${dscrValue == null ? "n/d" : (dscrValue >= 1 ? "COMPLIANT " : "NON COMPLIANT ") + "(" + dscrValue.toFixed(2) + "x)"}</div>
        <div class="kpi-sub">Entrate Mensili / Rate Debito</div>
      </div>
      <div class="kpi-card red">
        <div class="kpi-title">Debiti/Impegni a Breve Termine Residui</div>
        <div class="kpi-value text-red">${money(shortTermTotal)}</div>
        <div class="kpi-sub">Totale ancora da pagare</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Saldo Cassa Attuale</div>
        <div class="kpi-value">${money(balance)}</div>
        <div class="kpi-sub">Da Cash Flow</div>
      </div>
    </div>

    ${critical.length ? `
      <h3 style="font-size:0.85rem;margin:24px 0 10px;color:var(--text-muted)">Scadenze ad alta priorità  non completate</h3>
      <div class="mobile-cards-container" style="display:flex">
        ${critical.map(d => `<div class="m-card"><div class="m-card-header"><span class="m-card-title">${escapeHtml(d.title)}</span><span class="m-card-amount text-red">${money(d.amount)}</span></div><div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(d.due_date)} - ${escapeHtml(d.status)}</div></div>`).join("")}
      </div>` : ""}
  `;
}
