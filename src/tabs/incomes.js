import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow, deleteRow } from "../lib/db.js";
import { money, escapeHtml } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { notifyDataChanged } from "../lib/bus.js";
import { confirmDialog } from "../lib/confirm.js";

const TABLE = "recurring_income";
let editingId = null;

function badgeColor(person) {
  if (person === "Jo") return "var(--accent-amber)";
  if (person === "Eli") return "var(--accent-blue)";
  return "var(--accent-green)";
}

export function render() {
  const rows = getState().recurringIncome;
  const tbody = document.getElementById("incomes-table-body");
  const mobile = document.getElementById("incomes-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  if (!rows.length) tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Nessuna entrata fissa registrata.</td></tr>`;

  let total = 0;
  rows.forEach(inc => {
    if (inc.active !== false) total += Number(inc.monthly_amount || 0);
    const color = badgeColor(inc.subject);
    const rowClass = inc.active === false ? "inactive-row" : "";

    // Le righe con active=false restano visibili (non cancellano lo storico
    // dell'utente, riattivabili con "Modifica") ma non contano nel totale -
    // vedi filtro sopra. L'opacita' ridotta da sola era troppo sottile per
    // accorgersene scorrendo la lista a colpo d'occhio (segnalato da Jo il
    // 03/09/2026 dopo un conteggio manuale che le includeva per errore), quindi
    // ora c'e' anche un'etichetta esplicita, stesso pattern di card.js per le
    // voci escluse dal ciclo carta.
    const inactiveNote = inc.active === false ? ` <span class="hint">(inattiva - esclusa dal totale)</span>` : "";

    const tr = document.createElement("tr");
    tr.className = rowClass;
    tr.innerHTML = `
      <td><strong>${escapeHtml(inc.description)}</strong>${inactiveNote}</td>
      <td><span class="badge" style="background:${color}">${escapeHtml(inc.subject)}</span></td>
      <td>${escapeHtml(inc.frequency)}</td>
      <td class="amount text-green" style="text-align:right">${money(inc.monthly_amount)}</td>
      <td style="text-align:center">
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:0.6rem" data-edit="${inc.id}">Modifica</button>
        <button class="btn btn-red" style="padding:3px 6px;font-size:0.6rem" data-delete="${inc.id}">Elimina</button>
      </td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card" + (rowClass ? " " + rowClass : "");
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(inc.description)}</span>
        <span class="m-card-amount text-green">${money(inc.monthly_amount)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Cadenza: ${escapeHtml(inc.frequency)}</div>
      ${inactiveNote ? `<div class="hint">Inattiva - esclusa dal totale</div>` : ""}
      <div class="m-card-details">
        <span class="badge" style="background:${color}">${escapeHtml(inc.subject)}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${inc.id}">Modifica</button>
          <button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${inc.id}">Elimina</button>
        </div>
      </div>`;
    mobile.appendChild(card);
  });

  document.getElementById("incomes-total-sum").textContent = money(total);

  tbody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => onDelete(b.dataset.delete)));
  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => onEdit(b.dataset.edit)));
  mobile.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => onDelete(b.dataset.delete)));
  mobile.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => onEdit(b.dataset.edit)));
}

function resetForm() {
  editingId = null;
  document.getElementById("income-form").reset();
}

function onEdit(id) {
  const inc = getState().recurringIncome.find(r => String(r.id) === String(id));
  if (!inc) return;
  editingId = inc.id;
  document.getElementById("i-desc").value = inc.description;
  document.getElementById("i-person").value = inc.subject;
  document.getElementById("i-freq").value = inc.frequency;
  document.getElementById("i-amount").value = inc.monthly_amount;
  document.getElementById("i-active").checked = inc.active !== false;
  openModal("incomeModal");
}

async function onDelete(id) {
  if (!(await confirmDialog("Eliminare questa entrata fissa?"))) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    notifyDataChanged();
    toast("Entrata eliminata");
  } catch (err) {
    toastError(err);
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const payload = {
    description: document.getElementById("i-desc").value.trim(),
    subject: document.getElementById("i-person").value,
    frequency: document.getElementById("i-freq").value,
    monthly_amount: Number(document.getElementById("i-amount").value),
    active: document.getElementById("i-active").checked,
  };
  if (!payload.description || !Number.isFinite(payload.monthly_amount)) {
    toast("Inserisci descrizione e importo validi.", "error");
    return;
  }
  try {
    if (editingId) await updateRow(TABLE, editingId, payload);
    else await insertRow(TABLE, payload);
    closeModal("incomeModal");
    resetForm();
    await loadAll();
    notifyDataChanged();
    toast("Entrata salvata", "success");
  } catch (err) {
    toastError(err);
  }
}

export function initIncomes() {
  document.getElementById("income-form").addEventListener("submit", onSubmit);
  document.querySelector('[data-open-modal="incomeModal"]').addEventListener("click", resetForm);
}
