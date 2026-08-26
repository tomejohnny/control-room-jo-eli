import "./styles.css";
import { initAuth, signOut } from "./lib/auth.js";
import { wireModals } from "./lib/modal.js";
import { loadAll } from "./lib/store.js";
import { refreshKpis } from "./lib/kpis.js";
import { toastError } from "./lib/ui.js";

import { render as renderCashflow, initCashflow } from "./tabs/cashflow.js";
import { render as renderIncomes, initIncomes } from "./tabs/incomes.js";
import { render as renderBudget, initBudget } from "./tabs/budget.js";
import { render as renderGemelle, initGemelle } from "./tabs/gemelle.js";
import { render as renderScadenziario, initScadenziario } from "./tabs/scadenziario.js";
import { render as renderFisco, initFisco } from "./tabs/fisco.js";
import { render as renderTreasury } from "./tabs/treasury.js";
import { render as renderCapex, initCapex } from "./tabs/capex.js";
import { render as renderRisk } from "./tabs/risk.js";

let initialized = false;

function renderAll() {
  renderCashflow();
  renderIncomes();
  renderBudget();
  renderGemelle();
  renderScadenziario();
  renderFisco();
  renderTreasury();
  renderCapex();
  renderRisk();
  refreshKpis();
}

function wireNav() {
  document.querySelectorAll(".tab-btn[data-view]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
      document.querySelectorAll(".tab-btn[data-view]").forEach(el => el.classList.remove("active"));
      document.getElementById("view-" + btn.dataset.view).classList.add("active");
      btn.classList.add("active");
    });
  });
}

function wireLogout() {
  document.getElementById("logout-btn").addEventListener("click", () => signOut());
}

async function bootstrap(user) {
  document.getElementById("header-user").textContent = user.email || "";
  try {
    await loadAll();
  } catch (err) {
    toastError(err);
    return;
  }

  if (!initialized) {
    initCashflow();
    initIncomes();
    initBudget();
    initGemelle();
    initScadenziario();
    initFisco();
    initCapex();
    wireModals();
    wireNav();
    wireLogout();
    initialized = true;
  }

  renderAll();
}

initAuth({ onSignedIn: bootstrap });
