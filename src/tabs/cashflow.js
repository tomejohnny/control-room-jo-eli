import { getState, loadAll } from "../lib/store.js";
import { insertRow, insertRows, updateRow, deleteRow } from "../lib/db.js";
import { money, escapeHtml, todayIso } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { refreshKpis } from "../lib/kpis.js";

const TABLE = "cash_movements";
let editingId = null;

function filteredRows() {
  const search = document.getElementById("cf-search").value.trim().toLowerCase();
  const month = document.getElementById("cf-month").value;
  const type = document.getElementById("cf-type").value;
  return getState().cashMovements.filter(row => {
    const text = `${row.description || ""} ${row.subject || ""}`.toLowerCase();
    const matchesSearch = !search || text.includes(search);
    const matchesMonth = !month || String(row.movement_date || "").startsWith(month);
    const matchesType = !type || row.movement_type === type;
    return matchesSearch && matchesMonth && matchesType;
  });
}

function rowTemplate(tx) {
  const income = tx.movement_type === "ENTRATA";
  const sign = income ? "+ " : "- ";
  const colorClass = income ? "text-green" : "text-red";
  return { income, sign, colorClass };
}

export function render() {
  const rows = filteredRows();
  const tbody = document.getElementById("cf-table-body");
  const mobile = document.getElementById("cf-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nessun movimento.</td></tr>`;
  }

  let income = 0, expense = 0;
  rows.forEach(tx => {
    const { sign, colorClass } = rowTemplate(tx);
    if (tx.movement_type === "ENTRATA") income += Number(tx.amount || 0); else expense += Number(tx.amount || 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(tx.movement_date)}</td>
      <td><strong>${escapeHtml(tx.description)}</strong>${tx.account ? `<div style="font-size:0.65rem;color:var(--text-muted)">${escapeHtml(tx.account)}</div>` : ""}</td>
      <td>${escapeHtml(tx.subject)}</td>
      <td><span class="badge" style="background:${tx.movement_type === "ENTRATA" ? "var(--accent-green)" : "var(--accent-red)"}">${escapeHtml(tx.movement_type)}</span></td>
      <td class="amount ${colorClass}" style="text-align:right">${sign}${money(tx.amount)}</td>
      <td style="text-align:center">
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:0.6rem" data-edit="${tx.id}">Modifica</button>
        <button class="btn btn-red" style="padding:3px 6px;font-size:0.6rem" data-delete="${tx.id}">Elimina</button>
      </td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(tx.description)}</span>
        <span class="m-card-amount ${colorClass}">${sign}${money(tx.amount)}</span>
      </div>
      <div class="m-card-details">
        <span>${escapeHtml(tx.movement_date)} - <strong>${escapeHtml(tx.subject)}</strong></span>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge" style="background:${tx.movement_type === "ENTRATA" ? "var(--accent-green)" : "var(--accent-red)"}">${escapeHtml(tx.movement_type)}</span>
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${tx.id}">Modifica</button>
          <button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${tx.id}">Elimina</button>
        </div>
      </div>`;
    mobile.appendChild(card);
  });

  document.getElementById("cf-summary").innerHTML =
    `<span><b>Entrate:</b> ${money(income)}</span> <span><b>Uscite:</b> ${money(expense)}</span> <span><b>Saldo periodo:</b> ${money(income - expense)}</span> <span><b>Movimenti:</b> ${rows.length}</span>`;

  tbody.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => onDelete(b.dataset.delete)));
  tbody.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => onEdit(b.dataset.edit)));
  mobile.querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => onDelete(b.dataset.delete)));
  mobile.querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => onEdit(b.dataset.edit)));
}

function resetForm() {
  editingId = null;
  document.getElementById("tx-form").reset();
  document.getElementById("m-date").value = todayIso();
}

function onEdit(id) {
  const tx = getState().cashMovements.find(r => String(r.id) === String(id));
  if (!tx) return;
  editingId = tx.id;
  document.getElementById("m-date").value = tx.movement_date;
  document.getElementById("m-desc").value = tx.description;
  document.getElementById("m-person").value = tx.subject;
  document.getElementById("m-type").value = tx.movement_type;
  document.getElementById("m-account").value = tx.account || "";
  document.getElementById("m-amount").value = tx.amount;
  openModal("txModal");
}

async function onDelete(id) {
  if (!confirm("Eliminare questo movimento?")) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    render();
    refreshKpis();
    toast("Movimento eliminato");
  } catch (err) {
    toastError(err);
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const payload = {
    movement_date: document.getElementById("m-date").value,
    description: document.getElementById("m-desc").value.trim(),
    subject: document.getElementById("m-person").value,
    movement_type: document.getElementById("m-type").value,
    account: document.getElementById("m-account").value.trim() || null,
    amount: Number(document.getElementById("m-amount").value),
    status: "Registrato",
  };
  if (!payload.description || !Number.isFinite(payload.amount) || payload.amount < 0) {
    toast("Inserisci descrizione e importo validi.", "error");
    return;
  }
  try {
    if (editingId) await updateRow(TABLE, editingId, payload);
    else await insertRow(TABLE, payload);
    closeModal("txModal");
    resetForm();
    await loadAll();
    render();
    refreshKpis();
    toast("Movimento salvato", "success");
  } catch (err) {
    toastError(err);
  }
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines.shift().split(delimiter).map(h => h.trim().toUpperCase());
  return lines.map(line => {
    const values = line.split(delimiter).map(v => v.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] || ""]));
    const rawAmount = String(row.IMPORTO || "0").replaceAll(".", "").replace(",", ".").replace(/[^\d.-]/g, "");
    const type = String(row.TIPO || "").toUpperCase().includes("USC") ? "USCITA" : "ENTRATA";
    return {
      movement_date: row.DATA,
      description: row.DESCRIZIONE || "Importato CSV",
      subject: row.SOGGETTO || "Famiglia",
      movement_type: type,
      amount: Math.abs(Number(rawAmount) || 0),
      account: row.CONTO || null,
      status: "Registrato",
    };
  }).filter(r => r.movement_date && r.amount >= 0);
}

async function onCsvImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const rows = parseCsv(await file.text());
  event.target.value = "";
  if (!rows.length) return toast("CSV vuoto o colonne non riconosciute.", "error");
  if (!confirm(`Importare ${rows.length} movimenti?`)) return;
  try {
    await insertRows(TABLE, rows);
    await loadAll();
    render();
    refreshKpis();
    toast(`${rows.length} movimenti importati`, "success");
  } catch (err) {
    toastError(err);
  }
}

export function initCashflow() {
  document.getElementById("tx-form").addEventListener("submit", onSubmit);
  document.querySelector('[data-open-modal="txModal"]').addEventListener("click", resetForm);
  ["cf-search", "cf-month", "cf-type"].forEach(id => document.getElementById(id).addEventListener("input", render));
  document.getElementById("cf-reset").addEventListener("click", () => {
    ["cf-search", "cf-month", "cf-type"].forEach(id => (document.getElementById(id).value = ""));
    render();
  });
  document.getElementById("cf-import").addEventListener("click", () => document.getElementById("cf-file").click());
  document.getElementById("cf-file").addEventListener("change", onCsvImport);
}
