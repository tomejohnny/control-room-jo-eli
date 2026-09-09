import { getState } from "./store.js";
import {
  bankBalance, monthEndMargin, dscr, liquidityMonths, netWorth, savingsRate,
  FIDO_CASSA, saldoContabile, fidoUtilizzato, fidoSforamento,
} from "./finance.js";
import { money } from "./format.js";

export function refreshKpis() {
  const { cashMovements, fixedExpenses, recurringIncome, deadlines, investments, investmentTransactions } = getState();

  const balance = bankBalance(cashMovements);
  document.getElementById("kpi-balance").textContent = money(balance);
  document.getElementById("kpi-saldo-contabile").textContent = money(saldoContabile(balance));

  const margin = monthEndMargin(cashMovements, deadlines);
  const marginEl = document.getElementById("kpi-margin");
  const marginCard = document.getElementById("kpi-card-margin");
  marginEl.textContent = money(margin);
  marginCard.className = "kpi-card " + (margin >= 0 ? "green" : "red");
  marginEl.style.color = margin >= 0 ? "var(--accent-green)" : "var(--accent-red)";

  // Stessa logica fido di Saldo Cassa, applicata al saldo disponibile
  // PROIETTATO di fine mese: sotto zero l'intero fido e' gia' superato
  // ("sforamento", mai "fido residuo" - un saldo negativo non lascia fido
  // residuo). Tra 0 e FIDO_CASSA il margine e' comunque >= 0 (nessun
  // allarme) ma una parte del fido sarebbe in uso: nota informativa, non
  // un avviso. Sopra FIDO_CASSA il fido resta del tutto inutilizzato,
  // nessuna nota.
  const marginFidoEl = document.getElementById("kpi-margin-fido-note");
  const marginSforamento = fidoSforamento(margin);
  if (marginSforamento != null) {
    // .badge di default e' pensata per etichette brevi (white-space:nowrap) -
    // questo testo e' una frase intera, deve poter andare a capo dentro la
    // card invece di uscire dal bordo.
    marginFidoEl.innerHTML = `<span class="badge" style="background:var(--accent-red);white-space:normal;line-height:1.4">⚠️ Sforamento fido previsto: ${money(marginSforamento)}, oltre il fido di ${money(FIDO_CASSA)} disponibile</span>`;
    marginFidoEl.style.display = "";
  } else if (saldoContabile(margin) < 0) {
    marginFidoEl.textContent = `Fido in uso: ${money(fidoUtilizzato(margin))} di ${money(FIDO_CASSA)}`;
    marginFidoEl.style.display = "";
  } else {
    marginFidoEl.style.display = "none";
  }

  const dscrValue = dscr(recurringIncome, fixedExpenses);
  const dscrEl = document.getElementById("kpi-dscr");
  dscrEl.textContent = dscrValue == null ? "n/d" : dscrValue.toFixed(2) + "x";
  dscrEl.className = dscrValue == null ? "kpi-value" : "kpi-value " + (dscrValue >= 1 ? "text-green" : "text-red");

  const months = liquidityMonths(cashMovements, fixedExpenses);
  document.getElementById("kpi-liquidity").textContent = months == null ? "n/d" : months.toFixed(1) + " mesi";

  const worth = netWorth(cashMovements, fixedExpenses, investments, investmentTransactions);
  document.getElementById("kpi-networth").textContent = money(worth);

  const rate = savingsRate(recurringIncome, fixedExpenses);
  const rateEl = document.getElementById("kpi-savings-rate");
  rateEl.textContent = rate == null ? "n/d" : (rate * 100).toFixed(0) + "%";
  rateEl.className = rate == null ? "kpi-value" : "kpi-value " + (rate >= 0 ? "text-green" : "text-red");
}
