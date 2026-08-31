import { getState, loadAll } from "../lib/store.js";
import { insertRow, updateRow } from "../lib/db.js";
import { money, todayIso } from "../lib/format.js";
import { openModal, closeModal } from "../lib/modal.js";
import { toast, toastError } from "../lib/ui.js";
import { notifyDataChanged } from "../lib/bus.js";
import { lineChart } from "../lib/charts.js";
import { fetchLivePrice } from "../lib/marketprice.js";
import { investmentStats } from "../lib/investments.js";

// Match per id, non per nome: i due fondi delle bambine sono stati
// rinominati da "V80A - ..." a "VWCE - ..." il 31/08/2026 (cambio fondo
// da Jo), e un lookup per stringa esatta del nome si sarebbe rotto in
// silenzio a quel cambio (l'app avrebbe mostrato "investimento non
// presente" pur essendoci). L'id in Supabase resta stabile anche se il
// fondo cambia di nuovo in futuro ("da rivalutare verso fine piano",
// nota di Jo del 31/08/2026).
const TWIN_IDS = { Ambra: 1, Bianca: 2 };
let activePerson = "";

function findInvestment(id) {
  return getState().investments.find(inv => inv.id === id);
}

function tickerLabel(inv) {
  return inv?.ticker ? inv.ticker.split(".")[0] : "fondo";
}

export function render() {
  const ambraInv = findInvestment(TWIN_IDS.Ambra);
  const price = ambraInv?.current_value ?? findInvestment(TWIN_IDS.Bianca)?.current_value ?? 0;
  document.getElementById("display-v80a-price").textContent = money(price);

  const container = document.getElementById("gemelle-live-container");
  container.innerHTML = "";

  ["Ambra", "Bianca"].forEach(person => {
    const inv = findInvestment(TWIN_IDS[person]);
    const card = document.createElement("div");
    card.className = "m-card";
    if (!inv) {
      card.innerHTML = `<div class="m-card-header"><span class="m-card-title">${person}</span></div><div style="font-size:0.75rem;color:var(--text-muted)">Investimento non ancora presente in Supabase (esegui supabase/seed.sql).</div>`;
      container.appendChild(card);
      return;
    }
    const stats = investmentStats(inv, getState().investmentTransactions);
    const profit = stats.currentValue - stats.invested;
    const profitColor = profit >= 0 ? "var(--accent-green)" : "var(--accent-red)";
    card.innerHTML = `
      <div class="m-card-header">
        <span class="m-card-title">${person} (${tickerLabel(inv)})</span>
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
  const ambra = findInvestment(TWIN_IDS.Ambra);
  const ticker = ambra?.ticker || "VWCE.DE";
  try {
    const price = await fetchLivePrice(ticker);
    const now = new Date().toISOString();
    const updates = [TWIN_IDS.Ambra, TWIN_IDS.Bianca]
      .map(findInvestment)
      .filter(Boolean)
      .map(inv => updateRow("investments", inv.id, { current_value: price, last_update: now }));
    await Promise.all(updates);
    await loadAll();
    notifyDataChanged();
    toast(`Prezzo ${tickerLabel(ambra)} aggiornato: ` + money(price), "success");
  } catch (err) {
    toastError(err);
  }
}

async function updatePriceManually() {
  const ambra = findInvestment(TWIN_IDS.Ambra);
  const current = ambra?.current_value || 0;
  const input = prompt(`Inserisci il prezzo attuale dell'ETF (${ambra?.ticker || "fondo studio"}):`, current);
  if (!input || isNaN(input)) return;
  const price = parseFloat(input);
  const now = new Date().toISOString();
  try {
    const updates = [TWIN_IDS.Ambra, TWIN_IDS.Bianca]
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
  const inv = findInvestment(TWIN_IDS[activePerson]);
  if (!inv) return toast("Investimento non trovato per " + activePerson, "error");
  if (!Number.isFinite(amount) || amount <= 0) return toast("Inserisci un importo valido.", "error");
  const price = Number(inv.current_value || 0);
  if (!price) return toast("Imposta prima un prezzo valido.", "error");
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
