import { getState } from "../lib/store.js";
import { quarterlyTreasury } from "../lib/finance.js";
import { money } from "../lib/format.js";

export function render() {
  const { recurringIncome, fixedExpenses, deadlines } = getState();
  const quarters = quarterlyTreasury(recurringIncome, fixedExpenses, deadlines, 4);

  const tbody = document.getElementById("treasury-table-body");
  const mobile = document.getElementById("treasury-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  quarters.forEach(q => {
    const colorClass = q.net >= 0 ? "text-green" : "text-red";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${q.label}</td>
      <td>${money(q.income)}</td>
      <td>${money(q.expense)}</td>
      <td class="amount ${colorClass}" style="text-align:right">${money(q.net)}</td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header"><span class="m-card-title">${q.label}</span><span class="m-card-amount ${colorClass}">${money(q.net)}</span></div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Entrate: ${money(q.income)} | Uscite: ${money(q.expense)}</div>`;
    mobile.appendChild(card);
  });
}
