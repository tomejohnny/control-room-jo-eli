import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow } from "../lib/db.js";
import { money, todayIso } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { notifyDataChanged } from "../lib/bus.js";
import { lineChart } from "../lib/charts.js";
import { fetchLivePrice } from "../lib/marketprice.js";
import { investmentStats } from "../lib/investments.js";

const TWIN_NAMES = { Ambra: "V80A - Ambra", Bianca: "V80A - Bianca" };
let activePerson = "";

function findInvestment(name) {
  return getState().investments.find(inv => inv.name === name);
}

export function render() {
  const price = findInvestment(TWIN_NAMES.Ambra)?.current_value ?? findInvestment(TWIN_NAMES.Bianca)?.current_value ?? 0;
  document.getElementById("display-v80a-price").textContent = money(price);

  const container = document.getElementById("gemelle-live-container");
  container.innerHTML = "";

  ["Ambra", "Bianca"].forEach(person => {
    const inv = findInvestment(TWIN_NAMES[person]);
    const card = document.createElement("div");
    card.className = "m-card";
    if (!inv) {
      card.innerHTML = `<div class="m-card-header"><span class="m-card-title">${person} (V80A)</span></div><div style="font-size:0.75rem;color:var(--text-muted)">Investimento non ancora presente in Supabase (esegui supabase/seed.sql).</div>`;
      container.appendChild(card);
      return;
    }
    const stats = investmentStats(inv, getState().investmentTransactions);
    const profit = stats.currentValue - stats.invested;
    const profitColor = profit >= 0 ? "var(--accent-green)" : "var(--accent-red)";
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${person} (V80A)</span>
        <span class="m-card-amount">${money(stats.currentValue)}</span>
      </div>
      <div style="font-size:0.75rem;color:var(--text-muted)">
        Capitale Investito: ${money(stats.invested)} | Quote: ${stats.units.toFixed(3)}
      </div>
      <div class="m-card-details">
        <span>Profitto/Perdita: <strong style="color:${profitColor}">${money(profit)}</strong></span>
      </div>
      <div style="margin-top:8px">${lineChart({ points: stats.points, height: 140, refValue: stats.currentValue, refLabel: "Valore stimato oggi" })}</div>`;
    container.appendChild(card);
  });
}

async function fetchLiveMarketPrice() {
  const ambra = findInvestment(TWIN_NAMES.Ambra);
  const ticker = ambra?.ticker || "V80A.DE";
  try {
    const price = await fetchLivePrice(ticker);
    const now = new Date().toISOString();
    const updates = [TWIN_NAMES.Ambra, TWIN_NAMES.Bianca]
      .map(findInvestment)
      .filter(Boolean)
      .map(inv => updateRow("investments", inv.id, { current_value: price, last_update: now }));
    await Promise.all(updates);
    await loadAll();
    notifyDataChanged();
    toast("Prezzo V80A aggiornato: " + money(price), "success");
  } catch (err) {
    toastError(err);
  }
}

async function updatePriceManually() {
  const current = findInvestment(TWIN_NAMES.Ambra)?.current_value || 0;
  const input = prompt("Inserisci il prezzo attuale dell'ETF V80A:", current);
  if (!input || isNaN(input)) return;
  const price = parseFloat(input);
  const now = new Date().toISOString();
  try {
    const updates = [TWIN_NAMES.Ambra, TWIN_NAMES.Bianca]
      .map(findInvestment)
      .filter(Boolean)
      .map(inv => updateRow("investments", inv.id, { current_value: price, last_update: now }));
    await Promise.all(updates);
    await loadAll();
    notifyDataChanged();
    toast("Prezzo aggiornato", "success");
  } catch (err) {
    toastError(err);
  }
}

function openGemModal(person) {
  activePerson = person;
  document.getElementById("gemTitle").textContent = "Nuovo Versamento per " + person;
  document.getElementById("gem-form").reset();
  openModal("gemModal");
}

async function onGemSubmit(event) {
  event.preventDefault();
  const amount = Number(document.getElementById("g-amount").value);
  const inv = findInvestment(TWIN_NAMES[activePerson]);
  if (!inv) return toast("Investimento non trovato per " + activePerson, "error");
  if (!Number.isFinite(amount) || amount <= 0) return toast("Inserisci un importo valido.", "error");
  const price = Number(inv.current_value || 0);
  if (!price) return toast("Imposta prima un prezzo V80A valido.", "error");
  try {
    await insertRow("investment_transactions", {
      investment_id: inv.id,
      amount,
      units: amount / price,
      transaction_date: todayIso(),
    });
    closeModal("gemModal");
    await loadAll();
    notifyDataChanged();
    toast("Versamento registrato", "success");
  } catch (err) {
    toastError(err);
  }
}

export function initGemelle() {
  document.getElementById("gem-form").addEventListener("submit", onGemSubmit);
  document.getElementById("refresh-live-price").addEventListener("click", fetchLiveMarketPrice);
  document.getElementById("update-price-manually").addEventListener("click", updatePriceManually);
  document.querySelectorAll("[data-open-gem]").forEach(btn => {
    btn.addEventListener("click", () => openGemModal(btn.dataset.openGem));
  });
}
