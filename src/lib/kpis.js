import { getState } from "./store.js";
import { bankBalance, monthEndMargin, dscr, liquidityMonths, netWorth, savingsRate } from "./finance.js";
import { money } from "./format.js";

export function refreshKpis() {
  const { cashMovements, fixedExpenses, recurringIncome, deadlines, investments, investmentTransactions } = getState();

  const balance = bankBalance(cashMovements);
  document.getElementById("kpi-balance").textContent = money(balance);

  const margin = monthEndMargin(cashMovements, deadlines);
  const marginEl = document.getElementById("kpi-margin");
  const marginCard = document.getElementById("kpi-card-margin");
  marginEl.textContent = money(margin);
  marginCard.className = "kpi-card " + (margin >= 0 ? "green" : "red");
  marginEl.style.color = margin >= 0 ? "var(--accent-green)" : "var(--accent-red)";

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
