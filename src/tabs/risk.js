import { getState } from "../lib/store.js";
import { liquidityMonths, dscr, bankBalance } from "../lib/finance.js";
import { money, escapeHtml } from "../lib/format.js";

export function render() {
  const { cashMovements, fixedExpenses, recurringIncome, deadlines } = getState();

  const months = liquidityMonths(cashMovements, fixedExpenses);
  const dscrValue = dscr(recurringIncome, fixedExpenses);
  const balance = bankBalance(cashMovements);

  const shortTermDebts = deadlines.filter(d =>
    d.status !== "Completato" && String(d.category || "").toLowerCase().includes("debito")
  );
  const shortTermTotal = shortTermDebts.reduce((s, d) => s + Number(d.amount || 0), 0);

  const critical = deadlines.filter(d => d.status !== "Completato" && (d.status === "Critico" || d.priority === "Critica" || d.priority === "Alta"));

  const container = document.getElementById("risk-container");
  container.innerHTML = `
    <table class="desktop-table">
      <tr><td>Riserva di Liquidità (Saldo Cassa / Spese Fisse Mensili)</td><td class="amount ${months == null ? "" : months >= 3 ? "text-green" : "text-red"}" style="text-align:right">${months == null ? "n/d" : months.toFixed(1) + " Mesi"}</td></tr>
      <tr><td>Covenant Status (DSCR = Entrate Mensili / Rate Debito)</td><td class="amount ${dscrValue == null ? "" : dscrValue >= 1 ? "text-green" : "text-red"}" style="text-align:right">${dscrValue == null ? "n/d" : (dscrValue >= 1 ? "COMPLIANT " : "NON COMPLIANT ") + "(" + dscrValue.toFixed(2) + "x)"}</td></tr>
      <tr><td>Debiti/Impegni a Breve Termine Residui</td><td class="amount text-red" style="text-align:right">${money(shortTermTotal)}</td></tr>
      <tr><td>Saldo Cassa Attuale</td><td class="amount" style="text-align:right">${money(balance)}</td></tr>
    </table>
    <div class="mobile-cards-container">
      <div class="m-card"><div class="m-card-header"><span class="m-card-title">Riserva di Liquidità</span><span class="m-card-amount ${months == null ? "" : months >= 3 ? "text-green" : "text-red"}">${months == null ? "n/d" : months.toFixed(1) + " Mesi"}</span></div></div>
      <div class="m-card"><div class="m-card-header"><span class="m-card-title">Covenant Status (DSCR)</span><span class="m-card-amount ${dscrValue == null ? "" : dscrValue >= 1 ? "text-green" : "text-red"}">${dscrValue == null ? "n/d" : dscrValue.toFixed(2) + "x"}</span></div></div>
      <div class="m-card"><div class="m-card-header"><span class="m-card-title">Debiti a Breve Residui</span><span class="m-card-amount text-red">${money(shortTermTotal)}</span></div></div>
    </div>
    ${critical.length ? `
      <h3 style="font-size:0.85rem;margin:16px 0 8px;color:var(--text-muted)">Scadenze ad alta priorità non completate</h3>
      <div class="mobile-cards-container" style="display:flex">
        ${critical.map(d => `<div class="m-card"><div class="m-card-header"><span class="m-card-title">${escapeHtml(d.title)}</span><span class="m-card-amount text-red">${money(d.amount)}</span></div><div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(d.due_date)} - ${escapeHtml(d.status)}</div></div>`).join("")}
      </div>` : ""}
  `;
}
