import { getState } from "../lib/store.js";
import {
  quarterlyTreasury, bankBalance, monthEndMargin, dscr, liquidityMonths,
  totalMonthlyFixedExpenses, totalMonthlyIncome,
} from "../lib/finance.js";
import { money, escapeHtml, todayIso } from "../lib/format.js";

function selectedMonth() {
  const input = document.getElementById("report-month");
  return input.value || todayIso().slice(0, 7);
}

function inMonth(dateStr, monthStr) {
  return String(dateStr || "").startsWith(monthStr);
}

function budgetVsSpesoRows(fixedExpenses, monthMovements) {
  const budgetByCategory = new Map();
  fixedExpenses.filter(f => f.active !== false).forEach(f => {
    const cat = f.category || "Senza categoria";
    budgetByCategory.set(cat, (budgetByCategory.get(cat) || 0) + Number(f.amount || 0));
  });
  const actualByCategory = new Map();
  monthMovements
    .filter(m => m.movement_type === "USCITA" && m.status !== "Previsto")
    .forEach(m => {
      const cat = m.category || "Senza categoria";
      actualByCategory.set(cat, (actualByCategory.get(cat) || 0) + Number(m.amount || 0));
    });
  const categories = new Set([...budgetByCategory.keys(), ...actualByCategory.keys()]);
  return [...categories].sort().map(category => ({
    category,
    budget: budgetByCategory.get(category) || 0,
    actual: actualByCategory.get(category) || 0,
  }));
}

// Righe chiave/valore semplici (Situazione Attuale, Cash Flow, Budget
// Mensile Ricorrente, Proiezione Trimestre): genera SIA la tabella desktop
// SIA le card mobile, con lo stesso identico contenuto - stesso pattern
// gia' in uso in risk.js per le righe KPI (Riserva di Liquidita', DSCR...).
// Prima del 31/08/2026 report.js generava solo la tabella: sotto gli 800px
// spariva del tutto (bug corretto con un CSS che la teneva visibile ma
// rimpicciolita/grezza) - ora e' allineato al resto dell'app, con vere
// card mobile invece di una tabella forzata a scorrere.
function kvRows(rows) {
  const table = `<table class="desktop-table">${rows.map(r =>
    `<tr><td>${r.label}</td><td class="amount ${r.cls || ""}" style="text-align:right">${r.value}</td></tr>`
  ).join("")}</table>`;
  const cards = `<div class="mobile-cards-container">${rows.map(r =>
    `<div class="m-card"><div class="m-card-header"><span class="m-card-title">${r.label}</span><span class="m-card-amount ${r.cls || ""}">${r.value}</span></div></div>`
  ).join("")}</div>`;
  return table + cards;
}

export function render() {
  const month = selectedMonth();
  const { cashMovements, fixedExpenses, recurringIncome, deadlines } = getState();

  const monthMovements = cashMovements.filter(m => inMonth(m.movement_date, month));
  const income = monthMovements.filter(m => m.movement_type === "ENTRATA").reduce((s, m) => s + Number(m.amount || 0), 0);
  const expense = monthMovements.filter(m => m.movement_type === "USCITA").reduce((s, m) => s + Number(m.amount || 0), 0);
  const monthDeadlines = deadlines.filter(d => inMonth(d.due_date, month));

  const [y, m] = month.split("-").map(Number);
  const refDate = new Date(y, (m || 1) - 1, 1);
  const [quarter] = quarterlyTreasury(recurringIncome, fixedExpenses, deadlines, 1, refDate);

  const balance = bankBalance(cashMovements);
  const margin = monthEndMargin(cashMovements, deadlines, refDate);
  const dscrValue = dscr(recurringIncome, fixedExpenses);
  const months = liquidityMonths(cashMovements, fixedExpenses);
  const budgetTotal = totalMonthlyFixedExpenses(fixedExpenses);
  const incomeTotal = totalMonthlyIncome(recurringIncome);
  const budgetRows = budgetVsSpesoRows(fixedExpenses, monthMovements);

  document.getElementById("report-content").innerHTML = `
    <h3>Situazione Attuale (oggi)</h3>
    ${kvRows([
      { label: "Saldo Cassa", value: money(balance) },
      { label: "Margine Fine Mese", value: money(margin), cls: margin >= 0 ? "text-green" : "text-red" },
      { label: "DSCR", value: dscrValue == null ? "n/d" : dscrValue.toFixed(2) + "x" },
      { label: "Liquidità", value: months == null ? "n/d" : months.toFixed(1) + " mesi" },
    ])}

    <h3>Cash Flow — ${escapeHtml(month)}</h3>
    ${kvRows([
      { label: "Entrate", value: money(income), cls: "text-green" },
      { label: "Uscite", value: money(expense), cls: "text-red" },
      { label: "Netto del mese", value: money(income - expense), cls: income - expense >= 0 ? "text-green" : "text-red" },
      { label: "Movimenti", value: String(monthMovements.length) },
    ])}

    <h3>Budget Mensile Ricorrente</h3>
    ${kvRows([
      { label: "Totale entrate fisse mensili attive", value: money(incomeTotal), cls: "text-green" },
      { label: "Totale spese fisse mensili attive", value: money(budgetTotal), cls: "text-red" },
    ])}

    <h3>Budget vs Speso per Categoria — ${escapeHtml(month)}</h3>
    ${budgetRows.length ? `
      <table class="desktop-table">
        <thead><tr><th>Categoria</th><th style="text-align:right">Budget</th><th style="text-align:right">Speso</th><th style="text-align:right">Differenza</th></tr></thead>
        <tbody>${budgetRows.map(r => {
          const diff = r.budget - r.actual;
          return `<tr><td>${escapeHtml(r.category)}</td><td class="amount" style="text-align:right">${money(r.budget)}</td><td class="amount" style="text-align:right">${money(r.actual)}</td><td class="amount ${diff >= 0 ? "text-green" : "text-red"}" style="text-align:right">${money(diff)}</td></tr>`;
        }).join("")}</tbody>
      </table>
      <div class="mobile-cards-container">
        ${budgetRows.map(r => {
          const diff = r.budget - r.actual;
          return `<div class="m-card">
            <div class="m-card-header">
              <span class="m-card-title">${escapeHtml(r.category)}</span>
              <span class="m-card-amount ${diff >= 0 ? "text-green" : "text-red"}">${money(diff)}</span>
            </div>
            <div class="m-card-details">
              <span>Budget: ${money(r.budget)}</span>
              <span>Speso: ${money(r.actual)}</span>
            </div>
          </div>`;
        }).join("")}
      </div>
      <p class="hint">"Speso" conta solo i movimenti confermati con categoria assegnata (menu Movimento → Categoria). I movimenti "Da confermare" non sono inclusi finché non li confermi.</p>
      ` : `<p class="hint">Nessun budget o movimento categorizzato per questo mese.</p>`}

    <h3>Scadenze nel Mese</h3>
    ${monthDeadlines.length ? `
      <table class="desktop-table">
        <thead><tr><th>Descrizione</th><th>Data</th><th style="text-align:right">Importo</th><th>Stato</th></tr></thead>
        <tbody>${monthDeadlines.map(d => `<tr><td>${escapeHtml(d.title)}</td><td>${escapeHtml(d.due_date)}</td><td class="amount" style="text-align:right">${money(d.amount)}</td><td>${escapeHtml(d.status)}</td></tr>`).join("")}</tbody>
      </table>
      <div class="mobile-cards-container">
        ${monthDeadlines.map(d => `<div class="m-card">
          <div class="m-card-header">
            <span class="m-card-title">${escapeHtml(d.title)}</span>
            <span class="m-card-amount">${money(d.amount)}</span>
          </div>
          <div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(d.due_date)} - ${escapeHtml(d.status)}</div>
        </div>`).join("")}
      </div>` : `<p class="hint">Nessuna scadenza in questo mese.</p>`}

    <h3>Proiezione Trimestre — ${escapeHtml(quarter.label)}</h3>
    ${kvRows([
      { label: "Entrate previste", value: money(quarter.income), cls: "text-green" },
      { label: "Uscite previste", value: money(quarter.expense), cls: "text-red" },
      { label: "Netto previsto", value: money(quarter.net), cls: quarter.net >= 0 ? "text-green" : "text-red" },
    ])}
  `;
}

function monthCsv(month) {
  const rows = getState().cashMovements.filter(m => inMonth(m.movement_date, month));
  const escapeCsv = v => String(v ?? "").replaceAll(";", ",").replaceAll("\n", " ");
  const header = "Data;Descrizione;Soggetto;Tipo;Importo;Conto\n";
  const body = rows.map(r =>
    [r.movement_date, r.description, r.subject, r.movement_type, String(r.amount).replace(".", ","), r.account || ""]
      .map(escapeCsv).join(";")
  ).join("\n");
  return header + body;
}

function onExportCsv() {
  const month = selectedMonth();
  downloadFile(monthCsv(month), `cash-flow-${month}.csv`, "text/csv;charset=utf-8");
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function onExportBackup() {
  const state = getState();
  const backup = {
    exported_at: new Date().toISOString(),
    cash_movements: state.cashMovements,
    fixed_expenses: state.fixedExpenses,
    recurring_income: state.recurringIncome,
    deadlines: state.deadlines,
    investments: state.investments,
    investment_transactions: state.investmentTransactions,
  };
  downloadFile(JSON.stringify(backup, null, 2), `family-control-room-backup-${todayIso()}.json`, "application/json;charset=utf-8");
}

export function initReport() {
  const monthInput = document.getElementById("report-month");
  monthInput.value = todayIso().slice(0, 7);
  monthInput.addEventListener("change", render);
  document.getElementById("report-print").addEventListener("click", () => window.print());
  document.getElementById("report-csv").addEventListener("click", onExportCsv);
  document.getElementById("report-backup").addEventListener("click", onExportBackup);
}
