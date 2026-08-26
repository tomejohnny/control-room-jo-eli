import { getState } from "../lib/store.js";
import { money, escapeHtml } from "../lib/format.js";

function fiscalDeadlines() {
  return getState().deadlines.filter(d => String(d.category || "").toLowerCase().includes("fisc"));
}

export function render() {
  const rows = [...fiscalDeadlines()].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const tbody = document.getElementById("fisco-table-body");
  const mobile = document.getElementById("fisco-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Nessuna obbligazione fiscale in scadenziario (categoria "Fisco").</td></tr>`;
  }

  rows.forEach(d => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(d.title)}</td>
      <td>${escapeHtml(d.subject || "-")}</td>
      <td>${escapeHtml(d.due_date)}</td>
      <td class="amount" style="text-align:right">${money(d.amount)}</td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header"><span class="m-card-title">${escapeHtml(d.title)}</span><span class="m-card-amount text-amber">${money(d.amount)}</span></div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Soggetto: ${escapeHtml(d.subject || "-")} | Scadenza: ${escapeHtml(d.due_date)}</div>`;
    mobile.appendChild(card);
  });
}

function calculateTax() {
  const amount = parseFloat(document.getElementById("invoiceAmount").value) || 0;
  const inps = amount * 0.2245;
  const tax = amount * 0.0431;
  const total = inps + tax;
  document.getElementById("inpsResult").textContent = money(inps);
  document.getElementById("taxResult").textContent = money(tax);
  document.getElementById("totalResult").textContent = money(total);
}

export function initFisco() {
  document.getElementById("invoiceAmount").addEventListener("input", calculateTax);
  calculateTax();
}
