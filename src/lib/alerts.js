import { escapeHtml, money } from "./format.js";

const URGENT_DAYS = 7;

export function getUrgentDeadlines(deadlines, ref = new Date()) {
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() + URGENT_DAYS);
  return deadlines
    .filter(d => d.status !== "Completato" && d.status !== "Sospesa" && d.status !== "SOSPESA")
    .filter(d => d.status === "Critico" || (d.due_date && new Date(d.due_date) <= cutoff))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
}

export function renderAlertBanner(deadlines, onNavigate) {
  const banner = document.getElementById("alert-banner");
  const urgent = getUrgentDeadlines(deadlines);

  if (!urgent.length) {
    banner.innerHTML = "";
    banner.classList.remove("visible");
    return;
  }

  const items = urgent.slice(0, 4).map(d =>
    `${escapeHtml(d.title)} (${money(d.amount)}, ${escapeHtml(d.due_date)})`
  ).join(" · ");
  const more = urgent.length > 4 ? ` +${urgent.length - 4} altre` : "";

  banner.innerHTML = `
    <span>⚠️ <strong>${urgent.length} ${urgent.length > 1 ? "scadenze" : "scadenza"} da tenere d'occhio:</strong> ${items}${more}</span>
    <button type="button" id="alert-banner-link" class="btn btn-ghost" style="font-size:0.7rem">Vai allo Scadenziario</button>
  `;
  banner.classList.add("visible");
  document.getElementById("alert-banner-link").addEventListener("click", () => onNavigate("scadenziario"));
}
