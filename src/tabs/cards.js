import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow, deleteRow } from "../lib/db.js";
import { money, escapeHtml, todayIso } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { notifyDataChanged } from "../lib/bus.js";
import { confirmDialog } from "../lib/confirm.js";
import { groupTransactionsByCycle } from "../lib/cardtransactions.js";
import { cardPlafondStatus, plafondColor, plafondTileClass } from "../lib/creditcard.js";

const TABLE = "card_transactions";
const CARDHOLDERS = ["Jo", "Eli"];
// Plafond carta di credito: 1.500 euro a testa, per ciclo (29 del mese - 28
// del mese successivo). Spostato qui dal tab Risk & Burn il 01/09/2026: le
// carte si controllano tutte in un unico posto, insieme all'elenco spese.
const CARD_PLAFOND = 1500;
let editingId = null;

function fmtDate(d) {
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function groupTitle(g) {
  return `${g.isOpen ? "Ciclo aperto" : "Ciclo chiuso"} ${fmtDate(g.cycleStart)} - ${fmtDate(g.cycleEnd)}`;
}

function rowAmount(t) {
  return Number(t.amount || 0) + Number(t.fees || 0);
}

function rowHtml(t) {
  const excludedNote = t.excluded_from_cycle
    ? ` <span class="hint">(escluso dal totale - gia' tracciato altrove)</span>`
    : "";
  return `
    <tr>
      <td>${escapeHtml(t.purchase_date)}</td>
      <td>${escapeHtml(t.description)}${excludedNote}</td>
      <td>${escapeHtml(t.category || "-")}</td>
      <td class="amount" style="text-align:right">${money(rowAmount(t))}</td>
      <td style="text-align:center">
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:0.6rem" data-edit="${t.id}">Modifica</button>
        <button class="btn btn-red" style="padding:3px 6px;font-size:0.6rem" data-delete="${t.id}">Elimina</button>
      </td>
    </tr>`;
}

function mobileCardHtml(t) {
  const excludedNote = t.excluded_from_cycle
    ? `<div class="hint">Escluso dal totale - gia' tracciato altrove</div>`
    : "";
  return `
    <div class="m-card">
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(t.description)}</span>
        <span class="m-card-amount">${money(rowAmount(t))}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">${escapeHtml(t.purchase_date)} ${t.category ? "- " + escapeHtml(t.category) : ""}</div>
      ${excludedNote}
      <div class="m-card-details">
        <span></span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${t.id}">Modifica</button>
          <button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${t.id}">Elimina</button>
        </div>
      </div>
    </div>`;
}

function groupHtml(g) {
  const catChips = Object.entries(g.byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, tot]) => `<span class="badge" style="background:var(--text-muted)">${escapeHtml(cat)}: ${money(tot)}</span>`)
    .join(" ");

  return `
    <div class="card" style="margin-bottom:14px">
      <h2 style="font-size:0.95rem">
        <span>${escapeHtml(groupTitle(g))} <span class="hint">(liquidazione ${escapeHtml(g.settlementDate.toLocaleDateString("it-IT"))})</span></span>
        <strong class="amount">${money(g.total)}</strong>
      </h2>
      ${catChips ? `<div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap">${catChips}</div>` : ""}
      <table class="desktop-table">
        <thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th style="text-align:right">Importo</th><th style="text-align:center">Azioni</th></tr></thead>
        <tbody>${g.rows.length ? g.rows.map(rowHtml).join("") : `<tr><td colspan="5" class="empty-state">Nessun movimento in questo ciclo.</td></tr>`}</tbody>
      </table>
      <div class="mobile-cards-container">${g.rows.map(mobileCardHtml).join("")}</div>
    </div>`;
}

function plafondBarHtml(deadlines) {
  const statuses = CARDHOLDERS.map(person => ({
    person,
    ...cardPlafondStatus(deadlines, person, CARD_PLAFOND),
  }));
  const cycleLabel = statuses.length
    ? `${statuses[0].cycleStart.toLocaleDateString("it-IT", { day: "numeric", month: "short" })} - ${statuses[0].cycleEnd.toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`
    : "";
  return `
    <h3 style="font-size:0.85rem;margin:0 0 10px;color:var(--text-muted)">Plafond Carta di Credito - ciclo ${escapeHtml(cycleLabel)}</h3>
    <div class="grid-kpi" style="margin-bottom:6px">
      ${statuses.map(p => `
        <div class="kpi-card ${plafondTileClass(p.remaining, p.plafond)}">
          <div class="kpi-title">${escapeHtml(p.person)} - Disponibile</div>
          <div class="kpi-value ${plafondColor(p.remaining, p.plafond)}">${money(p.remaining)}</div>
          <div class="kpi-sub">Usati ${money(p.used)} di ${money(p.plafond)}</div>
        </div>`).join("")}
    </div>
    <p class="hint" style="margin-bottom:24px">Aggiornato in base alle spese carta registrate in Control Room - se non hai ancora mandato le ultime spese, il numero qui puo' essere piu' alto di quello reale.</p>`;
}

export function render() {
  const { cardTransactions, deadlines } = getState();
  const container = document.getElementById("cards-container");

  const groupsHtml = CARDHOLDERS.map(person => {
    const groups = groupTransactionsByCycle(cardTransactions, person, new Date(), 3);
    return `
      <h3 style="font-size:1rem;margin:18px 0 8px">${escapeHtml(person)}</h3>
      ${groups.map(groupHtml).join("")}`;
  }).join("");

  container.innerHTML = plafondBarHtml(deadlines) + groupsHtml;

  container.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  container.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
}

function resetForm() {
  editingId = null;
  document.getElementById("cardtx-form").reset();
  document.getElementById("ctx-date").value = todayIso();
}

function onEdit(id) {
  const t = getState().cardTransactions.find(r => String(r.id) === String(id));
  if (!t) return;
  editingId = t.id;
  document.getElementById("ctx-person").value = t.person;
  document.getElementById("ctx-date").value = t.purchase_date;
  document.getElementById("ctx-desc").value = t.description;
  document.getElementById("ctx-amount").value = t.amount;
  document.getElementById("ctx-fees").value = t.fees || "";
  document.getElementById("ctx-category").value = t.category || "";
  document.getElementById("ctx-excluded").checked = !!t.excluded_from_cycle;
  openModal("cardtxModal");
}

async function onDelete(id) {
  if (!(await confirmDialog("Eliminare questo movimento carta?"))) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    notifyDataChanged();
    toast("Movimento eliminato");
  } catch (err) {
    toastError(err);
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const payload = {
    person: document.getElementById("ctx-person").value,
    purchase_date: document.getElementById("ctx-date").value,
    description: document.getElementById("ctx-desc").value.trim(),
    amount: Number(document.getElementById("ctx-amount").value) || 0,
    fees: Number(document.getElementById("ctx-fees").value) || 0,
    category: document.getElementById("ctx-category").value.trim() || null,
    excluded_from_cycle: document.getElementById("ctx-excluded").checked,
  };
  if (!payload.description || !payload.purchase_date) {
    toast("Inserisci almeno data e descrizione.", "error");
    return;
  }
  try {
    if (editingId) await updateRow(TABLE, editingId, payload);
    else await insertRow(TABLE, payload);
    closeModal("cardtxModal");
    resetForm();
    await loadAll();
    notifyDataChanged();
    toast("Movimento salvato", "success");
  } catch (err) {
    toastError(err);
  }
}

export function initCards() {
  document.getElementById("cardtx-form").addEventListener("submit", onSubmit);
  document.querySelector('[data-open-modal="cardtxModal"]').addEventListener("click", resetForm);
}
