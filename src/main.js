import "./styles.css";
import { initAuth, signOut } from "./lib/auth.js";
import { wireModals } from "./lib/modal.js";
import { loadAll, getState } from "./lib/store.js";
import { refreshKpis } from "./lib/kpis.js";
import { toastError } from "./lib/ui.js";
import { renderAlertBanner, renderZeroMarginHero } from "./lib/alerts.js";
import { onDataChanged } from "./lib/bus.js";
import { initConfirm } from "./lib/confirm.js";

import { render as renderCashflow, initCashflow } from "./tabs/cashflow.js";
import { render as renderIncomes, initIncomes } from "./tabs/incomes.js";
import { render as renderBudget, initBudget } from "./tabs/budget.js";
import { render as renderGemelle, initGemelle } from "./tabs/gemelle.js";
import { render as renderScadenziario, initScadenziario } from "./tabs/scadenziario.js";
import { render as renderFisco, initFisco } from "./tabs/fisco.js";
import { render as renderTreasury } from "./tabs/treasury.js";
import { render as renderCapex, initCapex } from "./tabs/capex.js";
import { render as renderRisk } from "./tabs/risk.js";
import { render as renderReport, initReport } from "./tabs/report.js";

let initialized = false;

const PAGE_TITLES = {
  cashflow: ["Cash Flow", "Movimenti di cassa consolidati"],
  incomes: ["Entrate Fisse", "Entrate ricorrenti mensili"],
  budget: ["Master Budget", "Spese fisse e inventario"],
  gemelle: ["Ambra & Bianca", "Fondo di studio V80A"],
  scadenziario: ["Scadenziario", "Scadenze fiscali e finanziarie"],
  fisco: ["Fisco (27%)", "Cassetto fiscale e simulatore forfettario"],
  treasury: ["Treasury", "Proiezione trimestrale a 12 mesi"],
  capex: ["Capex & PAC", "Investimenti e piani di accumulo"],
  risk: ["Risk & Burn", "Liquidità, DSCR e rischio a breve"],
  report: ["Report", "Riepilogo mensile e trimestrale esportabile"],
};

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
  renderReport();
  refreshKpis();
  renderZeroMarginHero(getState().deadlines, switchToView);
  renderAlertBanner(getState().deadlines, switchToView);
}

export function switchToView(view) {
  document.querySelectorAll(".view-section").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-btn[data-view]").forEach(el => el.classList.remove("active"));
  document.getElementById("view-" + view)?.classList.add("active");
  document.querySelector(`.nav-btn[data-view="${view}"]`)?.classList.add("active");
  const [title, subtitle] = PAGE_TITLES[view] || ["", ""];
  document.getElementById("page-title").textContent = title;
  document.getElementById("page-subtitle").textContent = subtitle;
  closeMobileMenu();
}

function openMobileMenu() {
  document.getElementById("sidebar").classList.add("open");
  document.getElementById("sidebar-backdrop").classList.add("visible");
}

function closeMobileMenu() {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebar-backdrop").classList.remove("visible");
}

function wireNav() {
  document.querySelectorAll(".nav-btn[data-view]").forEach(btn => {
    btn.addEventListener("click", () => switchToView(btn.dataset.view));
  });
  document.getElementById("mobile-menu-btn").addEventListener("click", openMobileMenu);
  document.getElementById("sidebar-backdrop").addEventListener("click", closeMobileMenu);
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
    initReport();
    initConfirm();
    wireModals();
    wireNav();
    wireLogout();
    onDataChanged(renderAll);
    initialized = true;
  }

  renderAll();
}

initAuth({ onSignedIn: bootstrap });
