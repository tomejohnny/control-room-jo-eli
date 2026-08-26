import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow, deleteRow } from "../lib/db.js";
import { money, escapeHtml } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";

const TABLE = "investments";
let editingId = null;

function capexRows() {
  return getState().investments.filter(inv => inv.asset_type !== "fondo_studio");
}

export function render() {
  const rows = capexRows();
  const tbody = document.getElementById("capex-table-body");
  const mobile = document.getElementById("capex-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  if (!rows.length) tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Nessun investimento Capex/PAC registrato.</td></tr>`;

  rows.forEach(inv => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(inv.name)}</strong><div style="font-size:0.65rem;color:var(--text-muted)">${escapeHtml(inv.provider || "")}</div></td>
      <td class="amount text-green" style="text-align:right">${inv.monthly_contribution ? money(inv.monthly_contribution) + " /mo" : "-"}</td>
      <td class="amount" style="text-align:right">${money(inv.current_value)}</td>
      <td style="text-align:center">
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:0.6rem" data-edit="${inv.id}">Modifica</button>
        <button class="btn btn-red" style="padding:3px 6px;font-size:0.6rem" data-delete="${inv.id}">Elimina</button>
      </td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header"><span class="m-card-title">${escapeHtml(inv.name)}</span><span class="m-card-amount text-green">${money(inv.current_value)}</span></div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Stato: ${escapeHtml(inv.status || "-")} ${inv.monthly_contribution ? "| PAC: " + money(inv.monthly_contribution) + "/mo" : ""}</div>
      <div class="m-card-details">
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${inv.id}">Modifica</button>
          <button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${inv.id}">Elimina</button>
        </div>
      </div>`;
    mobile.appendChild(card);
  });

  tbody.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  tbody.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
  mobile.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  mobile.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
}

function resetForm() {
  editingId = null;
  document.getElementById("capex-form").reset();
}

function onEdit(id) {
  const inv = capexRows().find(r => String(r.id) === String(id));
  if (!inv) return;
  editingId = inv.id;
  document.getElementById("cx-name").value = inv.name;
  document.getElementById("cx-provider").value = inv.provider || "";
  document.getElementById("cx-value").value = inv.current_value;
  document.getElementById("cx-contribution").value = inv.monthly_contribution || "";
  document.getElementById("cx-status").value = inv.status || "active";
  openModal("capexModal");
}

async function onDelete(id) {
  if (!confirm("Eliminare questo investimento?")) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    render();
    toast("Investimento eliminato");
  } catch (err) {
    toastError(err);
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const contribution = document.getElementById("cx-contribution").value;
  const payload = {
    name: document.getElementById("cx-name").value.trim(),
    provider: document.getElementById("cx-provider").value.trim() || null,
    current_value: Number(document.getElementById("cx-value").value) || 0,
    monthly_contribution: contribution ? Number(contribution) : null,
    status: document.getElementById("cx-status").value,
    asset_type: "pac",
  };
  if (!payload.name) {
    toast("Inserisci un nome per l'investimento.", "error");
    return;
  }
  try {
    if (editingId) await updateRow(TABLE, editingId, payload);
    else await insertRow(TABLE, payload);
    closeModal("capexModal");
    resetForm();
    await loadAll();
    render();
    toast("Investimento salvato", "success");
  } catch (err) {
    toastError(err);
  }
}

export function initCapex() {
  document.getElementById("capex-form").addEventListener("submit", onSubmit);
  document.querySelector('[data-open-modal="capexModal"]').addEventListener("click", resetForm);
}
