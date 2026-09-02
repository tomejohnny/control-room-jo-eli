// Tab "Dove Va il Denaro" - versione live della dashboard pubblicata come
// artifact Claude il 02/09/2026 (richiesta da Jo il 01/09/2026, resa live
// il 02/09/2026: "metterei live 'dove va il denaro della famiglia'"). Sola
// lettura: nessun modello dati nuovo, nessun modal - legge solo quello che
// gli altri tab gia' scrivono (fixed_expenses, deadlines, budgets,
// card_transactions, investments/investment_transactions) e lo ricompone
// da un altro punto di vista. Le formule vivono in ../lib/analysis.js.

import { getState } from "../lib/store.js";
import { money, escapeHtml } from "../lib/format.js";
import {
  monthlyBreakdown,
  recurringMargin,
  cardCategoryBreakdown,
  pacStatus,
  accantonamentoDetail,
} from "../lib/analysis.js";

// Stesso ordine di hue fisso della dashboard statica (palette categoriale
// dataviz, mai ciclata): assegnato per posizione nella lista ordinata per
// importo, cosi' la barra piu' grande e' sempre la piu' "calda" a vedersi.
const BAR_HUES = ["blue", "orange", "aqua", "yellow", "magenta", "green", "violet", "red"];

function barRows(rows, total) {
  if (!rows.length) return `<div class="empty-state">Nessuna voce per questo periodo.</div>`;
  return `
    <div class="bar-list">
      ${rows.map((r, i) => {
        const pct = total > 0 ? (r.amount / total) * 100 : 0;
        const hue = BAR_HUES[i % BAR_HUES.length];
        return `
          <div class="bar-row">
            <div class="bar-row-label">${escapeHtml(r.category)}</div>
            <div class="bar-row-track">
              <div class="bar-row-fill bar-hue-${hue}" style="width:${pct.toFixed(2)}%"></div>
            </div>
            <div class="bar-row-value">${money(r.amount)} <span class="bar-row-pct">${pct.toFixed(1)}%</span></div>
          </div>`;
      }).join("")}
    </div>`;
}

function pacMeters(rows) {
  if (!rows.length) return `<div class="empty-state">Nessun piano di accumulo con PAC mensile impostato.</div>`;
  return `
    <div class="pac-grid">
      ${rows.map(p => {
        const pct = Math.round(p.pct * 100);
        return `
          <div class="pac-meter ${p.complete ? "pac-complete" : ""}">
            <div class="pac-meter-header">
              <span class="pac-meter-name">${escapeHtml(p.name)}</span>
              <span class="pac-meter-status">${p.complete ? "✓ versato" : money(p.planned - p.versato) + " mancante"}</span>
            </div>
            <div class="pac-meter-track"><div class="pac-meter-fill" style="width:${Math.min(pct, 100)}%"></div></div>
            <div class="pac-meter-figures">${money(p.versato)} di ${money(p.planned)} / mese</div>
          </div>`;
      }).join("")}
    </div>`;
}

function accantonamentoRows(detail) {
  if (!detail.rows.length) return `<div class="empty-state">Nessuna voce di Accantonamento Mensilizzato registrata.</div>`;
  const trackingStarted = detail.actualTotal > 0;
  return `
    ${!trackingStarted ? `<p class="hint" style="margin-bottom:10px">Il "versato" per queste voci non e' ancora tracciato in Control Room: qui sotto vedi solo il pianificato, finche' non iniziate a registrare gli accantonamenti reali.</p>` : ""}
    <table class="desktop-table">
      <thead><tr><th>Voce</th><th style="text-align:right">Pianificato</th><th style="text-align:right">Versato</th></tr></thead>
      <tbody>
        ${detail.rows.map(r => `
          <tr>
            <td>${escapeHtml(r.label)}</td>
            <td class="amount" style="text-align:right">${money(r.planned)}</td>
            <td class="amount" style="text-align:right">${r.actual > 0 ? money(r.actual) : "-"}</td>
          </tr>`).join("")}
      </tbody>
    </table>
    <div class="mobile-cards-container" style="margin-top:10px">
      ${detail.rows.map(r => `
        <div class="m-card">
          <div class="m-card-header"><span class="m-card-title">${escapeHtml(r.label)}</span><span class="m-card-amount">${money(r.planned)}</span></div>
          <div style="font-size:0.75rem;color:var(--text-muted)">Versato: ${r.actual > 0 ? money(r.actual) : "-"}</div>
        </div>`).join("")}
    </div>
    <div class="total-bar" style="margin-top:12px">
      <span class="label">Totale pianificato</span>
      <span class="value">${money(detail.plannedTotal)}</span>
    </div>`;
}

export function render() {
  const state = getState();
  const ref = new Date();

  const breakdown = monthlyBreakdown(state, ref);
  const margin = recurringMargin(breakdown);
  const fiscoRow = breakdown.rows.find(r => r.category === "Fisco");
  const fiscoPct = breakdown.total > 0 && fiscoRow ? (fiscoRow.amount / breakdown.total) * 100 : 0;

  const cardBreakdown = cardCategoryBreakdown(state, ref);
  const pac = pacStatus(state, ref);
  const accant = accantonamentoDetail(state);

  const container = document.getElementById("analysis-container");
  container.innerHTML = `
    <div class="grid-kpi" style="margin-bottom:22px">
      <div class="kpi-card">
        <div class="kpi-title">Spesa Totale del Mese</div>
        <div class="kpi-value">${money(breakdown.total)}</div>
        <div class="kpi-sub">Fisse + scadenze del mese + budget stimati</div>
      </div>
      <div class="kpi-card ${fiscoPct >= 50 ? "amber" : ""}">
        <div class="kpi-title">Quota Fisco sul Totale</div>
        <div class="kpi-value ${fiscoPct >= 50 ? "text-amber" : ""}">${fiscoPct.toFixed(1)}%</div>
        <div class="kpi-sub">${money(fiscoRow ? fiscoRow.amount : 0)}</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-title">Margine su cui Intervenire</div>
        <div class="kpi-value text-green">${money(margin.total)}</div>
        <div class="kpi-sub">Totale del mese, esclusa la quota Fisco</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Spesa con Carte - Ultimo Ciclo Chiuso</div>
        <div class="kpi-value">${money(cardBreakdown.total)}</div>
        <div class="kpi-sub">${escapeHtml(cardBreakdown.cycleLabel || "-")}</div>
      </div>
    </div>

    <h3 style="font-size:0.85rem;margin:0 0 10px;color:var(--text-muted)">1. La fotografia completa del mese</h3>
    <p class="hint">Tutte le uscite tracciate: spese fisse ricorrenti, scadenze fiscali e debiti in scadenza questo mese, budget Variabile Stimato e Accantonamento Mensilizzato del periodo piu' recente. Gli investimenti (risparmio) e le voci gia' contate altrove (Carta di Credito come metodo di pagamento, Abbonamento CapCut gia' dentro l'Accantonamento) non sono qui, per non contare due volte la stessa spesa.</p>
    ${barRows(breakdown.rows, breakdown.total)}

    <h3 style="font-size:0.85rem;margin:26px 0 10px;color:var(--text-muted)">2. Il margine su cui potete davvero intervenire</h3>
    <p class="hint">Lo stesso totale, senza il Fisco: quello che potete negoziare, ridurre o spostare voce per voce.</p>
    ${barRows(margin.rows, margin.total)}

    <h3 style="font-size:0.85rem;margin:26px 0 10px;color:var(--text-muted)">3. Dove va davvero la spesa con le carte</h3>
    <p class="hint">Jo + Eli, solo l'ultimo ciclo chiuso (dati verificati, non il ciclo ancora in corso).</p>
    ${barRows(cardBreakdown.rows, cardBreakdown.total)}

    <h3 style="font-size:0.85rem;margin:26px 0 10px;color:var(--text-muted)">4. Piani di accumulo: pianificato vs. versato questo mese</h3>
    ${pacMeters(pac)}

    <h3 style="font-size:0.85rem;margin:26px 0 10px;color:var(--text-muted)">5. Accantonamenti mensilizzati - periodo ${escapeHtml(accant.period || "-")}</h3>
    ${accantonamentoRows(accant)}
  `;
}
