import { escapeHtml, money } from "./format.js";
import { isDeadlinePending } from "./deadline-status.js";

const URGENT_DAYS = 7;

// Scadenze "a margine zero": una rata mancata non e' un semplice ritardo, fa
// decadere l'intero piano di rateazione (es. Accertamento con Adesione, art. 8
// c.3-bis D.Lgs. 218/1997 - il residuo dell'intero piano diventa esigibile in
// un'unica soluzione con sanzioni piene). Per queste il criterio "quanti giorni
// mancano" (URGENT_DAYS/getUrgentDeadlines) non basta: vanno mostrate SEMPRE,
// anche a 30+ giorni, finche' non risultano pagate. Il flag e' sul dato
// (deadlines.zero_margin_risk) invece che dedotto dal titolo, cosi' resta
// affidabile anche se il testo della scadenza cambia.
export function getNextZeroMarginDeadline(deadlines, ref = new Date()) {
  const pending = deadlines
    .filter(d => d.zero_margin_risk && d.status !== "Completato")
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  return pending[0] || null;
}

function countdownChip(dueDate, ref = new Date()) {
  const due = new Date(dueDate + "T23:59:59+02:00");
  const diffDays = Math.ceil((due - ref) / 86400000);
  let cls, label;
  if (diffDays < 0) { cls = "critical"; label = `SCADUTA DA ${Math.abs(diffDays)} GIORNI`; }
  else if (diffDays === 0) { cls = "critical"; label = "SCADE OGGI"; }
  else if (diffDays <= 10) { cls = "critical"; label = `TRA ${diffDays} GIORNI`; }
  else if (diffDays <= 25) { cls = "warning"; label = `TRA ${diffDays} GIORNI`; }
  else { cls = "neutral"; label = `TRA ${diffDays} GIORNI`; }
  return { cls, label };
}

export function renderZeroMarginHero(deadlines, onNavigate) {
  const hero = document.getElementById("zero-margin-hero");
  if (!hero) return;
  const next = getNextZeroMarginDeadline(deadlines);

  if (!next) {
    hero.innerHTML = "";
    hero.classList.remove("visible");
    return;
  }

  const { cls, label } = countdownChip(next.due_date);
  const dueLabel = new Date(next.due_date + "T00:00:00").toLocaleDateString("it-IT", {
    day: "numeric", month: "long", year: "numeric",
  });

  hero.innerHTML = `
    <div class="zmh-eyebrow">Prossima scadenza a margine zero</div>
    <div class="zmh-main">
      <div class="zmh-title">${escapeHtml(next.title)}</div>
      <div class="zmh-amount">${money(next.amount)}</div>
    </div>
    <div class="zmh-row">
      <span class="zmh-date">Scadenza ${escapeHtml(dueLabel)}</span>
      <span class="zmh-chip zmh-${cls}">${label}</span>
      <button type="button" id="zmh-link" class="btn btn-ghost" style="font-size:0.7rem">Vai allo Scadenziario</button>
    </div>
  `;
  hero.classList.add("visible");
  document.getElementById("zmh-link").addEventListener("click", () => onNavigate("scadenziario"));
}

export function getUrgentDeadlines(deadlines, ref = new Date()) {
  const cutoff = new Date(ref);
  cutoff.setDate(cutoff.getDate() + URGENT_DAYS);
  return deadlines
    .filter(isDeadlinePending)
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
