import "./styles.css";
import { supabase } from "./supabase.js";

const TABLE = "cash_movements";
let allMovements = [];
let chart = null;

const status = document.createElement("div");
status.id = "supabase-status";
status.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;padding:10px 14px;border-radius:8px;background:#172033;color:#fff;font:14px system-ui;box-shadow:0 4px 18px rgba(0,0,0,.3)";
document.body.appendChild(status);

const ui = document.createElement("section");
ui.id = "cashflow-controls";
ui.style.cssText = "margin:16px 0;padding:16px;border:1px solid #d9dee8;border-radius:12px;background:#fff;font:14px system-ui";
ui.innerHTML = `
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <input id="cf-search" placeholder="Cerca descrizione o soggetto" style="padding:8px;min-width:220px">
    <input id="cf-month" type="month" style="padding:8px">
    <select id="cf-type" style="padding:8px"><option value="">Tutti i tipi</option><option>ENTRATA</option><option>USCITA</option></select>
    <select id="cf-account" style="padding:8px"><option value="">Tutti i conti</option></select>
    <button id="cf-reset" type="button">Azzera filtri</button>
    <button id="cf-import" type="button">Importa CSV</button>
    <input id="cf-file" type="file" accept=".csv,text/csv" hidden>
  </div>
  <div id="cf-summary" style="display:flex;gap:18px;flex-wrap:wrap;margin-top:14px"></div>
  <canvas id="cf-chart" height="90" style="margin-top:16px"></canvas>
`;
document.body.prepend(ui);

function money(value) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function getCashFlowTable() { return document.querySelectorAll("table")[0] || null; }
function showError(message) { status.textContent = `Supabase: ${message}`; status.style.background = "#b42318"; }
function setOk(message) { status.textContent = message; status.style.background = "#087443"; }

function filteredRows() {
  const search = document.querySelector("#cf-search").value.trim().toLowerCase();
  const month = document.querySelector("#cf-month").value;
  const type = document.querySelector("#cf-type").value;
  const account = document.querySelector("#cf-account").value;
  return allMovements.filter(row => {
    const text = `${row.description || ""} ${row.subject || ""}`.toLowerCase();
    return (!search || text.includes(search)) && (!month || String(row.movement_date || "").startsWith(month)) && (!type || row.movement_type === type) && (!account || row.account === account);
  });
}

function renderSummary(rows) {
  const income = rows.filter(r => r.movement_type === "ENTRATA").reduce((s, r) => s + Number(r.amount || 0), 0);
  const expense = rows.filter(r => r.movement_type === "USCITA").reduce((s, r) => s + Number(r.amount || 0), 0);
  document.querySelector("#cf-summary").innerHTML = `<span><b>Entrate:</b> ${money(income)}</span><span><b>Uscite:</b> ${money(expense)}</span><span><b>Saldo:</b> ${money(income - expense)}</span><span><b>Movimenti:</b> ${rows.length}</span>`;
}

function renderChart(rows) {
  const canvas = document.querySelector("#cf-chart");
  if (!canvas || !window.Chart) return;
  const months = [...new Set(rows.map(r => String(r.movement_date || "").slice(0, 7)).filter(Boolean))].sort();
  const income = months.map(m => rows.filter(r => String(r.movement_date).startsWith(m) && r.movement_type === "ENTRATA").reduce((s, r) => s + Number(r.amount || 0), 0));
  const expense = months.map(m => rows.filter(r => String(r.movement_date).startsWith(m) && r.movement_type === "USCITA").reduce((s, r) => s + Number(r.amount || 0), 0));
  if (chart) chart.destroy();
  chart = new window.Chart(canvas, { type: "bar", data: { labels: months, datasets: [{ label: "Entrate", data: income, backgroundColor: "#087443" }, { label: "Uscite", data: expense, backgroundColor: "#b42318" }] }, options: { responsive: true, scales: { y: { beginAtZero: true } } } });
}

function renderMovements(rows) {
  const table = getCashFlowTable();
  if (!table) return showError("Tabella Cash Flow non trovata");
  let body = table.querySelector("tbody");
  if (!body) { body = document.createElement("tbody"); table.appendChild(body); }
  body.innerHTML = rows.map(row => {
    const income = row.movement_type === "ENTRATA";
    return `<tr data-db-id="${escapeHtml(row.id)}"><td>${escapeHtml(row.movement_date)}</td><td>${escapeHtml(row.description)}</td><td>${escapeHtml(row.subject)}</td><td><span class="badge ${income ? "income" : "expense"}">${escapeHtml(row.movement_type)}</span></td><td class="amount ${income ? "income" : "expense"}">${income ? "+" : "-"} ${money(row.amount)}</td><td><button class="edit-db-row" data-id="${escapeHtml(row.id)}">Modifica</button> <button class="delete-db-row" data-id="${escapeHtml(row.id)}">Elimina</button></td></tr>`;
  }).join("");
  body.querySelectorAll(".edit-db-row").forEach(b => b.addEventListener("click", () => openMovementForm(allMovements.find(r => String(r.id) === String(b.dataset.id)))));
  body.querySelectorAll(".delete-db-row").forEach(b => b.addEventListener("click", () => deleteMovement(b.dataset.id)));
  renderSummary(rows);
  renderChart(rows);
}

async function loadMovements() {
  status.textContent = "Caricamento movimenti...";
  const { data, error } = await supabase.from(TABLE).select("*").order("movement_date", { ascending: false }).order("id", { ascending: false });
  if (error) return showError(error.message);
  allMovements = data || [];
  const accounts = [...new Set(allMovements.map(r => r.account).filter(Boolean))];
  const select = document.querySelector("#cf-account");
  select.innerHTML = `<option value="">Tutti i conti</option>${accounts.map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("")}`;
  applyFilters();
  setOk(`Supabase collegato · ${allMovements.length} movimenti`);
}

async function deleteMovement(id) {
  if (!confirm("Eliminare questo movimento?")) return;
  const { error } = await supabase.from(TABLE).delete().eq("id", id);
  if (error) return showError(error.message);
  await loadMovements();
}

function openMovementForm(existing = null) {
  if (document.querySelector("#db-movement-form")) return;
  const form = document.createElement("form");
  form.id = "db-movement-form";
  form.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;background:#172033;color:#fff;padding:24px;border-radius:12px;width:360px;box-shadow:0 10px 40px rgba(0,0,0,.5);font:14px system-ui";
  form.innerHTML = `<h3 style="margin-top:0">${existing ? "Modifica movimento" : "Nuovo movimento"}</h3><label>Data</label><input name="movement_date" type="date" required style="width:100%;margin:6px 0 12px;padding:8px"><label>Descrizione</label><input name="description" type="text" required style="width:100%;margin:6px 0 12px;padding:8px"><label>Soggetto</label><input name="subject" type="text" required style="width:100%;margin:6px 0 12px;padding:8px"><label>Tipo</label><select name="movement_type" required style="width:100%;margin:6px 0 12px;padding:8px"><option>ENTRATA</option><option>USCITA</option></select><label>Importo</label><input name="amount" type="number" min="0" step="0.01" required style="width:100%;margin:6px 0 12px;padding:8px"><label>Conto</label><input name="account" type="text" required style="width:100%;margin:6px 0 12px;padding:8px"><div style="display:flex;gap:8px;margin-top:16px"><button type="submit">Salva</button><button type="button" id="cancel-db-movement">Annulla</button></div>`;
  document.body.appendChild(form);
  if (existing) for (const key of ["movement_date", "description", "subject", "movement_type", "amount", "account"]) if (existing[key] != null && form.elements[key]) form.elements[key].value = existing[key];
  form.querySelector("#cancel-db-movement").onclick = () => form.remove();
  form.onsubmit = async event => {
    event.preventDefault();
    const v = new FormData(form);
    const payload = { movement_date: v.get("movement_date"), description: v.get("description"), subject: v.get("subject"), movement_type: v.get("movement_type"), amount: Number(v.get("amount")), account: v.get("account"), status: existing?.status || "Registrato" };
    const result = existing ? await supabase.from(TABLE).update(payload).eq("id", existing.id) : await supabase.from(TABLE).insert(payload);
    if (result.error) return showError(result.error.message);
    form.remove();
    await loadMovements();
  };
}

function applyFilters() { renderMovements(filteredRows()); }

function connectAddButton() {
  const button = [...document.querySelectorAll("button")].find(b => b.innerText.trim().includes("Movimento"));
  if (button) button.addEventListener("click", () => openMovementForm());
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const delimiter = lines[0].includes(";") ? ";" : "\t";
  const headers = lines.shift().split(delimiter).map(h => h.trim().toUpperCase());
  return lines.map(line => {
    const values = line.split(delimiter).map(v => v.trim());
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] || ""]));
    const rawAmount = String(row.IMPORTO || "0").replaceAll(".", "").replace(",", ".").replace(/[^\d.-]/g, "");
    const type = String(row.TIPO || "").toUpperCase().includes("USC") ? "USCITA" : "ENTRATA";
    return { movement_date: row.DATA, description: row.DESCRIZIONE || "Importato CSV", subject: row.SOGGETTO || "", movement_type: type, amount: Math.abs(Number(rawAmount) || 0), account: row.CONTO || "", status: "Registrato" };
  }).filter(r => r.movement_date && r.amount >= 0);
}

function connectCsvImport() {
  document.querySelector("#cf-import").onclick = () => document.querySelector("#cf-file").click();
  document.querySelector("#cf-file").onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    if (!rows.length) return showError("CSV vuoto o colonne non riconosciute");
    if (!confirm(`Importare ${rows.length} movimenti?`)) return;
    const { error } = await supabase.from(TABLE).insert(rows);
    if (error) return showError(error.message);
    event.target.value = "";
    await loadMovements();
  };
}

["#cf-search", "#cf-month", "#cf-type", "#cf-account"].forEach(selector => document.querySelector(selector).addEventListener("input", applyFilters));
document.querySelector("#cf-reset").onclick = () => { ["#cf-search", "#cf-month", "#cf-type", "#cf-account"].forEach(s => document.querySelector(s).value = ""); applyFilters(); };

function loadChartJs() {
  if (window.Chart) return Promise.resolve();
  return new Promise((resolve, reject) => { const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/chart.js"; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
}

connectAddButton();
connectCsvImport();
loadChartJs().finally(loadMovements);
