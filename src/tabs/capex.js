import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow, deleteRow } from "../lib/db.js";
import { money, escapeHtml, todayIso } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { notifyDataChanged } from "../lib/bus.js";
import { confirmDialog } from "../lib/confirm.js";
import { lineChart } from "../lib/charts.js";
import { fetchLivePrice } from "../lib/marketprice.js";
import { investmentStats } from "../lib/investments.js";

const TABLE = "investments";
let editingId = null;
let activeDepositId = null;

function capexRows() {
  return getState().investments.filter(inv => inv.asset_type !== "fondo_studio");
}

export function render() {
  const rows = capexRows();
  const container = document.getElementById("capex-container");
  container.innerHTML = "";

  if (!rows.length) {
    container.innerHTML = `<div class="empty-state">Nessun investimento Capex/PAC registrato.</div>`;
    return;
  }

  rows.forEach(inv => {
    const stats = investmentStats(inv, getState().investmentTransactions);
    const card = document.createElement("div");
    card.className = "m-card";

    const detailsLine = stats.hasUnits
      ? `Quote: ${stats.units.toFixed(4)} | Prezzo/quota: ${money(inv.current_value)} | Capitale Investito: ${money(stats.invested)}`
      : `Stato: ${escapeHtml(inv.status || "-")}${inv.monthly_contribution ? " | PAC: " + money(inv.monthly_contribution) + "/mo" : ""}`;

    const profit = stats.hasUnits ? stats.currentValue - stats.invested : null;
    const profitLine = profit != null
      ? `<div class="m-card-details"><span>Profitto/Perdita: <strong style="color:${profit >= 0 ? "var(--accent-green)" : "var(--accent-red)"}">${money(profit)}</strong></span></div>`
      : "";

    const chart = stats.hasUnits
      ? `<div style="margin-top:8px">${lineChart({ points: stats.points, height: 130, refValue: stats.currentValue, refLabel: "Valore stimato oggi" })}</div>`
      : "";

    const actions = [
      inv.ticker ? `<button class="btn btn-green" style="padding:3px 8px;font-size:0.65rem" data-refresh="${inv.id}">Aggiorna Prezzo</button>` : "",
      inv.ticker ? `<button class="btn" style="padding:3px 8px;font-size:0.65rem" data-deposit="${inv.id}">+ Versamento</button>` : "",
      `<button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${inv.id}">Modifica</button>`,
      `<button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${inv.id}">Elimina</button>`,
    ].join("");

    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(inv.name)}${inv.provider ? `<div style="font-size:0.65rem;color:var(--text-muted);font-weight:400">${escapeHtml(inv.provider)}</div>` : ""}</span>
        <span class="m-card-amount text-green">${money(stats.currentValue)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">${detailsLine}</div>
      ${profitLine}
      ${chart}
      <div class="m-card-details" style="flex-wrap:wrap;gap:6px">${actions}</div>`;
    container.appendChild(card);
  });

  container.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  container.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
  container.querySelectorAll("[data-refresh]").forEach(el => el.addEventListener("click", () => onRefreshPrice(el.dataset.refresh)));
  container.querySelectorAll("[data-deposit]").forEach(el => el.addEventListener("click", () => onOpenDeposit(el.dataset.deposit)));
}

function resetForm() {
  editingId = null;
  document.getElementById("capex-form").reset();
  document.getElementById("cx-value-label").textContent = "Valore Attuale (€)";
}

function onEdit(id) {
  const inv = capexRows().find(r => String(r.id) === String(id));
  if (!inv) return;
  editingId = inv.id;
  const stats = investmentStats(inv, getState().investmentTransactions);
  document.getElementById("cx-name").value = inv.name;
  document.getElementById("cx-provider").value = inv.provider || "";
  document.getElementById("cx-ticker").value = inv.ticker || "";
  document.getElementById("cx-value").value = inv.current_value;
  document.getElementById("cx-contribution").value = inv.monthly_contribution || "";
  document.getElementById("cx-status").value = inv.status || "active";
  document.getElementById("cx-value-label").textContent = stats.hasUnits ? "Prezzo per Quota (€)" : "Valore Attuale (€)";
  openModal("capexModal");
}

async function onDelete(id) {
  if (!(await confirmDialog("Eliminare questo investimento?"))) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    notifyDataChanged();
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
    ticker: document.getElementById("cx-ticker").value.trim() || null,
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
    notifyDataChanged();
    toast("Investimento salvato", "success");
  } catch (err) {
    toastError(err);
  }
}

async function onRefreshPrice(id) {
  const inv = capexRows().find(r => String(r.id) === String(id));
  if (!inv?.ticker) return;
  try {
    const price = await fetchLivePrice(inv.ticker);
    await updateRow(TABLE, inv.id, { current_value: price, last_update: new Date().toISOString() });
    await loadAll();
    notifyDataChanged();
    toast(`Prezzo aggiornato: ${money(price)}`, "success");
  } catch (err) {
    toastError(err);
  }
}

function onOpenDeposit(id) {
  const inv = capexRows().find(r => String(r.id) === String(id));
  if (!inv) return;
  activeDepositId = inv.id;
  document.getElementById("capexDepositTitle").textContent = "Nuovo Versamento — " + inv.name;
  document.getElementById("capex-deposit-form").reset();
  openModal("capexDepositModal");
}

async function onDepositSubmit(event) {
  event.preventDefault();
  const amount = Number(document.getElementById("cxd-amount").value);
  const inv = capexRows().find(r => String(r.id) === String(activeDepositId));
  if (!inv) return toast("Investimento non trovato.", "error");
  if (!Number.isFinite(amount) || amount <= 0) return toast("Inserisci un importo valido.", "error");
  const price = Number(inv.current_value || 0);
  if (!price) return toast("Imposta prima un prezzo/quota valido (Modifica o Aggiorna Prezzo).", "error");
  try {
    await insertRow("investment_transactions", {
      investment_id: inv.id,
      amount,
      units: amount / price,
      transaction_date: todayIso(),
    });
    closeModal("capexDepositModal");
    await loadAll();
    notifyDataChanged();
    toast("Versamento registrato", "success");
  } catch (err) {
    toastError(err);
  }
}

export function initCapex() {
  document.getElementById("capex-form").addEventListener("submit", onSubmit);
  document.getElementById("capex-deposit-form").addEventListener("submit", onDepositSubmit);
  document.querySelector('[data-open-modal="capexModal"]').addEventListener("click", resetForm);
}
