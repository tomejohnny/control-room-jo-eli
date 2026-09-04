import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow, deleteRow } from "../lib/db.js";
import { totalMonthlyFixedExpenses } from "../lib/finance.js";
import { variabileStimatoConsuntivo } from "../lib/budgetActual.js";
import { money, escapeHtml, todayIso } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { notifyDataChanged } from "../lib/bus.js";
import { confirmDialog } from "../lib/confirm.js";

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

  rows.forEach(b => {
    const color = badgeColor(b.subject);
    const rowClass = b.active === false ? "inactive-row" : "";

    const cardBadge = b.paid_by_card
      ? `<span class="badge" style="background:var(--text-muted)" title="Pagato con carta di credito: nessun movimento mensile separato, l'impatto di cassa e' nella liquidazione del ciclo carta">Carta</span>`
      : "";
    // Vedi nota identica in incomes.js: opacita' da sola era troppo sottile,
    // ora anche etichetta esplicita (stesso pattern di cards.js).
    const inactiveNote = b.active === false ? ` <span class="hint">(inattiva - esclusa dal totale)</span>` : "";

    const tr = document.createElement("tr");
    tr.className = rowClass;
    tr.innerHTML = `
      <td><strong>${escapeHtml(b.description)}</strong>${inactiveNote}</td>
      <td>${escapeHtml(b.category)}</td>
      <td><span class="badge" style="background:${color}">${escapeHtml(b.subject)}</span> ${cardBadge}</td>
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
      ${inactiveNote ? `<div class="hint">Inattiva - esclusa dal totale</div>` : ""}
      <div class="m-card-details">
        <span class="badge" style="background:${color}">${escapeHtml(b.subject)}</span> ${cardBadge}
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:0.65rem" data-edit="${b.id}">Modifica</button>
          <button class="btn btn-red" style="padding:3px 8px;font-size:0.65rem" data-delete="${b.id}">Elimina</button>
        </div>
      </div>`;
    mobile.appendChild(card);
  });

  // Il totale e' l'equivalente mensile (una voce Bimestrale/Trimestrale/...
  // pesa per la sua quota mensile, non per l'importo pieno che si vede nella
  // riga) - stessa funzione usata da Risk & Burn, Treasury e le altre viste
  // che sommano Fisso Certo a un totale mensile, vedi finance.js.
  const fissoTotal = totalMonthlyFixedExpenses(rows);
  document.getElementById("budget-total-sum").textContent = money(fissoTotal);

  tbody.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  tbody.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));
  mobile.querySelectorAll("[data-delete]").forEach(el => el.addEventListener("click", () => onDelete(el.dataset.delete)));
  mobile.querySelectorAll("[data-edit]").forEach(el => el.addEventListener("click", () => onEdit(el.dataset.edit)));

  const variableTotal = renderVariabileStimato();
  const accantTotal = renderBudgetTier("Accantonamento Mensilizzato", "budget-accant-table-body", "budget-accant-mobile", "budget-accant-total-sum");
  document.getElementById("budget-grand-total-sum").innerHTML = `<strong>${money(fissoTotal + variableTotal + accantTotal)}</strong>`;
}

// Variabile Stimato: a differenza di Accantonamento Mensilizzato (sotto),
// qui ha senso un vero confronto Stimato/Consuntivo - i movimenti carta gia'
// categorizzati con la tassonomia canonica (categories.js) dicono quanto si
// e' speso davvero per categoria. Il consuntivo e' calcolato al volo da
// budgetActual.js, non e' un valore salvato.
function renderVariabileStimato() {
  const all = getState().budgets.filter(b => b.tier === "Variabile Stimato");
  const tbody = document.getElementById("budget-variable-table-body");
  const mobile = document.getElementById("budget-variable-mobile");
  if (!tbody || !mobile) return 0;
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  const periods = [...new Set(all.map(b => b.period))].sort();
  const latestPeriod = periods[periods.length - 1];
  document.getElementById("budget-variable-period").textContent = latestPeriod || "-";
  const rows = all.filter(b => b.period === latestPeriod);

  // Il consuntivo di un mese passato e' definitivo; quello del mese in
  // corso e' per forza parziale (non tutte le spese del mese sono ancora
  // successe) - va etichettato come tale per non farlo leggere come un
  // dato di chiusura (richiesto da Jo il 04/09/2026).
  const noteEl = document.getElementById("budget-variable-note");
  const today = new Date();
  const currentMonth = todayIso().slice(0, 7);
  if (noteEl) {
    if (latestPeriod === currentMonth) {
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      noteEl.textContent = `Consuntivo parziale - mese in corso (giorno ${today.getDate()} di ${daysInMonth})`;
      noteEl.style.display = "";
    } else {
      noteEl.style.display = "none";
    }
  }

  if (!rows.length) tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Nessuna voce per questo periodo.</td></tr>`;

  const computed = variabileStimatoConsuntivo(rows, getState().cardTransactions, latestPeriod || "");

  let total = 0;
  computed.forEach(b => {
    total += b.stimato;
    const label = (b.notes || "").replace(/^\[[^\]]+\]\s*/, "").split(" - ")[0] || b.category;
    const overBudget = b.scostamento > 0;
    const scostamentoClass = overBudget ? "text-red" : "text-green";
    const scostamentoLabel = b.scostamentoPct == null
      ? money(b.scostamento)
      : `${money(b.scostamento)} (${b.scostamento >= 0 ? "+" : ""}${b.scostamentoPct.toFixed(0)}%)`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(label)}</strong></td>
      <td>${escapeHtml(b.category)}</td>
      <td class="amount" style="text-align:right">${money(b.stimato)}</td>
      <td class="amount" style="text-align:right">${money(b.consuntivo)}</td>
      <td class="amount ${scostamentoClass}" style="text-align:right">${scostamentoLabel}</td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(label)}</span>
        <span class="m-card-amount ${scostamentoClass}">${scostamentoLabel}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Cat: <strong>${escapeHtml(b.category)}</strong></div>
      <div class="m-card-details">
        <span>Stimato: ${money(b.stimato)}</span>
        <span>Consuntivo: ${money(b.consuntivo)}</span>
      </div>`;
    mobile.appendChild(card);
  });

  document.getElementById("budget-variable-total-sum").textContent = money(total);
  return total;
}

// Accantonamento Mensilizzato: pagamento reale una tantum, quota mensile
// virtuale - qui il confronto "quanto speso questo mese" non avrebbe senso
// (la spesa vera avviene una volta sola, non ogni mese), a differenza di
// Variabile Stimato sopra. Resta la vista sola-lettura originale.
//
// Vive nella tabella "budgets" (colonna tier), separata da fixed_expenses.
// Letta qui in sola lettura: la sua gestione (aggiunta/modifica) resta nel
// modello dati finche' non viene costruita una UI dedicata. Mostra sempre
// il periodo piu' recente presente nei dati, cosi' la vista si aggiorna da
// sola quando si passa al mese successivo, senza bisogno di modificare il
// codice.
function renderBudgetTier(tier, tbodyId, mobileId, totalId) {
  const all = getState().budgets.filter(b => b.tier === tier);
  const tbody = document.getElementById(tbodyId);
  const mobile = document.getElementById(mobileId);
  if (!tbody || !mobile) return 0;
  tbody.innerHTML = "";
  mobile.innerHTML = "";

  const periods = [...new Set(all.map(b => b.period))].sort();
  const latestPeriod = periods[periods.length - 1];
  document.getElementById("budget-variable-period").textContent = latestPeriod || "-";
  const rows = all.filter(b => b.period === latestPeriod);

  if (!rows.length) tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Nessuna voce per questo periodo.</td></tr>`;

  let total = 0;
  rows.forEach(b => {
    total += Number(b.planned_amount || 0);
    const label = (b.notes || "").replace(/^\[[^\]]+\]\s*/, "").split(" - ")[0] || b.category;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(label)}</strong></td>
      <td>${escapeHtml(b.category)}</td>
      <td class="amount text-red" style="text-align:right">${money(b.planned_amount)}</td>`;
    tbody.appendChild(tr);

    const card = document.createElement("div");
    card.className = "m-card";
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${escapeHtml(label)}</span>
        <span class="m-card-amount text-red">${money(b.planned_amount)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">Cat: <strong>${escapeHtml(b.category)}</strong></div>`;
    mobile.appendChild(card);
  });

  document.getElementById(totalId).textContent = money(total);
  return total;
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
  document.getElementById("b-remaining").value = b.remaining_balance || "";
  openModal("budgetModal");
}

async function onDelete(id) {
  if (!(await confirmDialog("Eliminare questa voce di budget?"))) return;
  try {
    await deleteRow(TABLE, id);
    await loadAll();
    notifyDataChanged();
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
    remaining_balance: document.getElementById("b-remaining").value
      ? Number(document.getElementById("b-remaining").value)
      : null,
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
    notifyDataChanged();
    toast("Voce salvata", "success");
  } catch (err) {
    toastError(err);
  }
}

export function initBudget() {
  document.getElementById("budget-form").addEventListener("submit", onSubmit);
  document.querySelector('[data-open-modal="budgetModal"]').addEventListener("click", resetForm);
}
