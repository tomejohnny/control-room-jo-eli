import { getState } from "../lib/store.js";
import { money, escapeHtml } from "../lib/format.js";

// Vista di sola lettura sullo storico bank_transactions (gen-set 2026,
// popolato a parte per analisi storiche - vedi bank_transactions in
// Supabase). E' un dataset separato da cash_movements (il ledger live di
// Cash Flow Consolidato, che non va toccato qui): niente insert/update/
// delete, solo consultazione con filtri e totali.
//
// Le righe excluded_from_analysis=true (es. liquidazioni carta gia'
// tracciate come movimento a parte) restano visibili in elenco ma escluse
// dai totali - stesso pattern gia' usato in cards.js per Klarna/CapCut, per
// non contare la stessa spesa due volte.

function filteredRows() {
  const search = document.getElementById("bh-search").value.trim().toLowerCase();
  const month = document.getElementById("bh-month").value;
  const type = document.getElementById("bh-type").value;
  const category = document.getElementById("bh-category").value;
  return getState().bankTransactions.filter(row => {
    const text = `${row.description || ""} ${row.category || ""}`.toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const matchesMonth = !month || String(row.transaction_date || "").startsWith(month);
    const matchesType = !type || row.movement_type === type;
    const matchesCategory = !category || row.category === category;
    return matchesSearch && matchesMonth && matchesType && matchesCategory;
  });
}

function renderCategoryOptions() {
  const select = document.getElementById("bh-category");
  if (!select) return;
  const current = select.value;
  const categories = [...new Set(getState().bankTransactions.map(r => r.category).filter(Boolean))].sort();
  select.innerHTML = `<option value="">Tutte le categorie</option>${categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("")}`;
  select.value = current;
}

export function render() {
  renderCategoryOptions();
  const rows = filteredRows();
  const tbody = document.getElementById("bh-table-body");
  const mobile = document.getElementById("bh-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  if (!rows.length) tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Nessun movimento per questi filtri.</td></tr>`;

  let income = 0, expense = 0;
  rows.forEach(tx => {
    const isIncome = tx.movement_type === "ENTRATA";
    const colorClass = isIncome ? "text-green" : "text-red";
    const sign = isIncome ? "+ " : "- ";
    if (!tx.excluded_from_analysis) {
      if (isIncome) income += Number(tx.amount || 0); else expense += Number(tx.amount || 0);
    }
    const excludedNote = tx.excluded_from_analysis
      ? ` <span class="hint">(escluso dal totale - gia' tracciato altrove)</span>`
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(tx.transaction_date)}</td>
      <td><strong>${escapeHtml(tx.description)}</strong>${excludedNote}</td>
      <td>${escapeHtml(tx.category || "-")}</td>
      <td class="amount ${colorClass}" style="text-align:right">${sign}${money(tx.amount)}</td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(tx.description)}</span>
        <span class="m-card-amount ${colorClass}">${sign}${money(tx.amount)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(tx.transaction_date)}${tx.category ? " - " + escapeHtml(tx.category) : ""}</div>
      ${tx.excluded_from_analysis ? `<div class="hint">Escluso dal totale - gia' tracciato altrove</div>` : ""}`;
    mobile.appendChild(card);
  });

  document.getElementById("bh-summary").innerHTML =
    `<span><b>Entrate:</b> ${money(income)}</span> <span><b>Uscite:</b> ${money(expense)}</span> <span><b>Netto:</b> ${money(income - expense)}</span> <span><b>Movimenti:</b> ${rows.length}</span>`;
}

export function initBankHistory() {
  ["bh-search", "bh-month", "bh-type", "bh-category"].forEach(id => document.getElementById(id).addEventListener("input", render));
  document.getElementById("bh-reset").addEventListener("click", () => {
    ["bh-search", "bh-month", "bh-type", "bh-category"].forEach(id => (document.getElementById(id).value = ""));
    render();
  });
}
