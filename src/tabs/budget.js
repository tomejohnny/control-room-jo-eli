import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow, deleteRow } from "../lib/db.js";
import { money, escapeHtml } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { refreshKpis } from "../lib/kpis.js";

const TABLE = "fixed_expenses";
let editingId = null;

function badgeColor(person) {
  if (person === "Jo") return "var(--accent-amber)";
  if (person === "Eli") return "var(--accent-green)";
  return "var(--accent-blue)";
}

export function render() {
  const rows = getState().fixedExpenses;
  const tbody = document.getElementById("budget-table-body");
  const mobile = document.getElementById("budget-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  if (!rows.length) tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nessuna voce di budget.</td></tr>`;

  let total = 0;
  rows.forEach(b => {
    if (b.active !== false) total += Number(b.amount || 0);
    const color = badgeColor(b.subject);
    const rowClass = b.active === false ? "inactive-row" : "";

    const tr = document.createElement("tr");
    tr.className = rowClass;
    tr.innerHTML = `
      <td><strong>${escapeHtml(b.description)}</strong></td>
      <td>${escapeHtml(b.category)}</td>
      <td><span class="badge" style="background:${color}">${escapeHtml(b.subject)}</span></td>
      <td>${escapeHtml(b.frequency)}</td>
      <td class="amount text-red" style="text-align:right">${money(b.amount)}</td>
      <td style="text-align:center">
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:0.6rem" data-edit="${b.id}">Modifica</button>
        <button class="btn btn-red" style="padding:3px 6px;font-size:0.6rem" data-delete="${b.id}">Elimina</button>
      </td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card" + (rowClass ? " " + rowClass : "");
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(b.description)}</span>
        <span class="m-card-amount text-red">${money(b.amount)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Cat: <strong>${escapeHtml(b.category)}</strong> | Cadenza: ${escapeHtml(b.frequency)}</div>
      <div class="m-card-details">
        <span class="badge" style="background:${color}">${escapeHtml(b.subject)}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${b.id}">Modifica</button>
          <button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${b.id}">Elimina</button>
        </div>
      </div>`;
    mobile.appendChild(card);
  });

  document.getElementById("budget-total-sum").textContent = money(total);

  tbody.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  tbody.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
  mobile.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  mobile.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
}

function resetForm() {
  editingId = null;
  document.getElementById("budget-form").reset();
}

function onEdit(id) {
  const b = getState().fixedExpenses.find(r => String(r.id) === String(id));
  if (!b) return;
  editingId = b.id;
  document.getElementById("b-desc").value = b.description;
  document.getElementById("b-cat").value = b.category || "";
  document.getElementById("b-person").value = b.subject;
  document.getElementById("b-freq").value = b.frequency;
  document.getElementById("b-amount").value = b.amount;
  document.getElementById("b-dueday").value = b.due_day || "";
  document.getElementById("b-active").checked = b.active !== false;
  openModal("budgetModal");
}

async function onDelete(id) {
  if (!confirm("Eliminare questa voce di budget?")) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    render();
    refreshKpis();
    toast("Voce eliminata");
  } catch (err) {
    toastError(err);
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const dueDay = document.getElementById("b-dueday").value;
  const payload = {
    description: document.getElementById("b-desc").value.trim(),
    category: document.getElementById("b-cat").value.trim(),
    subject: document.getElementById("b-person").value,
    frequency: document.getElementById("b-freq").value,
    amount: Number(document.getElementById("b-amount").value),
    due_day: dueDay ? Number(dueDay) : null,
    active: document.getElementById("b-active").checked,
  };
  if (!payload.description || !Number.isFinite(payload.amount)) {
    toast("Inserisci descrizione e importo validi.", "error");
    return;
  }
  try {
    if (editingId) await updateRow(TABLE, editingId, payload);
    else await insertRow(TABLE, payload);
    closeModal("budgetModal");
    resetForm();
    await loadAll();
    render();
    refreshKpis();
    toast("Voce salvata", "success");
  } catch (err) {
    toastError(err);
  }
}

export function initBudget() {
  document.getElementById("budget-form").addEventListener("submit", onSubmit);
  document.querySelector('[data-open-modal="budgetModal"]').addEventListener("click", resetForm);
}
