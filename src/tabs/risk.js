import { getState } from "../lib/store.js";
import { liquidityMonths, dscr, bankBalance } from "../lib/finance.js";
import { money, escapeHtml } from "../lib/format.js";
import { isDeadlinePending } from "../lib/deadline-status.js";

// Il plafond carta di credito (Jo/Eli) e' stato spostato nel tab "Carte" il
// 01/09/2026: li' convive con l'elenco spese singole per ciclo, quindi ha
// piu' senso vederlo in quella sezione invece che qui in cima a Risk & Burn,
// che ora si concentra solo su liquidita'/DSCR/debiti/scadenze critiche.

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

  // Le kpi-card sono le stesse gia' definite in styles.css (usate anche nella
  // barra in cima a ogni pagina): un grid responsive che si allarga da solo
  // invece di una tabella a larghezza fissa - risolve lo spazio vuoto che
  // restava su schermi larghi con la vecchia tabella a due colonne.
  const container = document.getElementById("risk-container");
  container.innerHTML = `
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
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px">
        ${critical.map(d => `<div class="m-card"><div class="m-card-header"><span class="m-card-title">${escapeHtml(d.title)}</span><span class="m-card-amount text-red">${money(d.amount)}</span></div><div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(d.due_date)} - ${escapeHtml(d.status)}</div></div>`).join("")}
      </div>` : ""}
  `;
}
