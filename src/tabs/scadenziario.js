import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow, deleteRow } from "../lib/db.js";
import { money, escapeHtml, todayIso } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { refreshKpis } from "../lib/kpis.js";
import { findMatch } from "../lib/reconcile.js";

const TABLE = "deadlines";
let editingId = null;

function statusColor(status) {
  if (status === "Critico") return "var(--accent-red)";
  if (status === "In Scadenza") return "var(--accent-amber)";
  if (status === "Completato") return "var(--accent-green)";
  return "var(--accent-blue)";
}

export function render() {
  const { deadlines, cashMovements } = getState();
  const rows = [...deadlines].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const tbody = document.getElementById("scad-table-body");
  const mobile = document.getElementById("scad-mobile");
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  if (!rows.length) tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Nessuna scadenza registrata.</td></tr>`;

  rows.forEach(d => {
    const color = statusColor(d.status);
    const match = d.status !== "Completato" ? findMatch(d, cashMovements) : null;
    const matchBadge = match
      ? `<div class="match-hint">✓ Match in Cash Flow: ${escapeHtml(match.description)} (${escapeHtml(match.movement_date)})
          <button class="btn btn-green" style="padding:2px 6px;font-size:0.6rem" data-reconcile="${d.id}">Segna Completato</button>
        </div>`
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.due_date)}</strong></td>
      <td>${escapeHtml(d.title)}${matchBadge}</td>
      <td>${escapeHtml(d.category)}</td>
      <td class="amount text-amber" style="text-align:right">${money(d.amount)}</td>
      <td style="text-align:center"><span class="badge" style="background:${color}">${escapeHtml(d.status)}</span></td>
      <td style="text-align:center">
        <button class="btn btn-ghost" style="padding:3px 6px;font-size:0.6rem" data-edit="${d.id}">Modifica</button>
        <button class="btn btn-red" style="padding:3px 6px;font-size:0.6rem" data-delete="${d.id}">Elimina</button>
      </td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(d.title)}</span>
        <span class="m-card-amount text-amber">${money(d.amount)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Data: <strong>${escapeHtml(d.due_date)}</strong> | Cat: ${escapeHtml(d.category)} | ${escapeHtml(d.subject || "")}</div>
      ${matchBadge}
      <div class="m-card-details">
        <span class="badge" style="background:${color}">${escapeHtml(d.status)}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${d.id}">Modifica</button>
          <button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${d.id}">Elimina</button>
        </div>
      </div>`;
    mobile.appendChild(card);
  });

  tbody.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  tbody.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
  tbody.querySelectorAll("[data-reconcile]").forEach(el => el.addEventListener("click", () => onReconcile(el.dataset.reconcile)));
  mobile.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  mobile.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
  mobile.querySelectorAll("[data-reconcile]").forEach(el => el.addEventListener("click", () => onReconcile(el.dataset.reconcile)));
}

async function onReconcile(id) {
  try {
    await updateRow(TABLE, id, { status: "Completato" });
    await loadAll();
    render();
    refreshKpis();
    toast("Scadenza segnata come completata", "success");
  } catch (err) {
    toastError(err);
  }
}

function resetForm() {
  editingId = null;
  document.getElementById("scad-form").reset();
  document.getElementById("s-date").value = todayIso();
}

function onEdit(id) {
  const d = getState().deadlines.find(r => String(r.id) === String(id));
  if (!d) return;
  editingId = d.id;
  document.getElementById("s-date").value = d.due_date;
  document.getElementById("s-title").value = d.title;
  document.getElementById("s-cat").value = d.category || "";
  document.getElementById("s-person").value = d.subject || "Famiglia";
  document.getElementById("s-priority").value = d.priority || "Media";
  document.getElementById("s-status").value = d.status || "Pianificato";
  document.getElementById("s-amount").value = d.amount;
  openModal("scadModal");
}

async function onDelete(id) {
  if (!confirm("Eliminare questa scadenza?")) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    render();
    refreshKpis();
    toast("Scadenza eliminata");
  } catch (err) {
    toastError(err);
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const payload = {
    due_date: document.getElementById("s-date").value,
    title: document.getElementById("s-title").value.trim(),
    category: document.getElementById("s-cat").value.trim(),
    subject: document.getElementById("s-person").value,
    priority: document.getElementById("s-priority").value,
    status: document.getElementById("s-status").value,
    amount: Number(document.getElementById("s-amount").value),
  };
  if (!payload.title || !Number.isFinite(payload.amount)) {
    toast("Inserisci descrizione e importo validi.", "error");
    return;
  }
  try {
    if (editingId) await updateRow(TABLE, editingId, payload);
    else await insertRow(TABLE, payload);
    closeModal("scadModal");
    resetForm();
    await loadAll();
    render();
    refreshKpis();
    toast("Scadenza salvata", "success");
  } catch (err) {
    toastError(err);
  }
}

const ICAL_TOKEN_KEY = "control_room_ical_token";

function readStoredToken() {
  try {
    return localStorage.getItem(ICAL_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

function storeToken(token) {
  try {
    localStorage.setItem(ICAL_TOKEN_KEY, token);
  } catch {
    // storage non disponibile (es. private browsing): il token resta solo in memoria per questa sessione
  }
}

function initCalendarSync() {
  const tokenInput = document.getElementById("ical-token");
  tokenInput.value = readStoredToken();
  tokenInput.addEventListener("input", () => storeToken(tokenInput.value.trim()));

  document.getElementById("ical-copy").addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (!token) return toast("Incolla prima il token del feed.", "error");
    storeToken(token);
    const url = `${window.location.origin}/api/calendar.ics?token=${encodeURIComponent(token)}`;
    document.getElementById("ical-url-display").textContent = url;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copiato negli appunti", "success");
    } catch {
      toast("Link generato qui sotto — copialo manualmente.");
    }
  });
}

export function initScadenziario() {
  document.getElementById("scad-form").addEventListener("submit", onSubmit);
  document.querySelector('[data-open-modal="scadModal"]').addEventListener("click", resetForm);
  initCalendarSync();
}
