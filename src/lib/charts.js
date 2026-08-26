import { escapeHtml } from "./format.js";

// Grafici SVG minimali, senza dipendenze esterne. Usano le variabili CSS
// del tema esistente cosi' seguono automaticamente palette e dark/light.

export function barChart({ labels, series, width = 600, height = 200 }) {
  if (!labels.length) return `<div class="empty-state">Nessun dato da mostrare.</div>`;

  const padding = { top: 10, right: 10, bottom: 26, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const groupW = chartW / labels.length;
  const barGap = 4;
  const barW = Math.max(3, (groupW - barGap * (series.length + 1)) / series.length);
  const max = Math.max(1, ...series.flatMap(s => s.values.map(v => Math.abs(v || 0))));

  let bars = "";
  labels.forEach((label, i) => {
    const groupX = padding.left + i * groupW;
    series.forEach((s, si) => {
      const value = Math.abs(s.values[i] || 0);
      const barH = (value / max) * chartH;
      const x = groupX + barGap + si * (barW + barGap);
      const y = padding.top + (chartH - barH);
      bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(0, barH).toFixed(1)}" fill="${s.color}" rx="2"/>`;
    });
    bars += `<text x="${(groupX + groupW / 2).toFixed(1)}" y="${height - 8}" font-size="10" fill="var(--text-muted)" text-anchor="middle">${escapeHtml(label)}</text>`;
  });

  const legend = series.map(s =>
    `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:14px">
      <span style="width:10px;height:10px;border-radius:2px;background:${s.color};display:inline-block"></span>${escapeHtml(s.label)}
    </span>`
  ).join("");

  return `<div>
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet">${bars}</svg>
    <div style="display:flex;flex-wrap:wrap;font-size:0.7rem;color:var(--text-muted);margin-top:6px">${legend}</div>
  </div>`;
}

export function lineChart({ points, width = 600, height = 180, refValue, refLabel }) {
  if (!points.length) return `<div class="empty-state">Nessuno storico versamenti ancora.</div>`;

  const padding = { top: 20, right: 10, bottom: 20, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxY = Math.max(1, ...points.map(p => p.y), refValue || 0);

  const refLine = refValue == null ? "" : (() => {
    const ry = padding.top + chartH - (refValue / maxY) * chartH;
    return `
      <line x1="${padding.left}" y1="${ry.toFixed(1)}" x2="${(padding.left + chartW).toFixed(1)}" y2="${ry.toFixed(1)}" stroke="var(--accent-blue)" stroke-dasharray="4" stroke-width="1.5"/>
      <text x="${(padding.left + chartW).toFixed(1)}" y="${(ry - 4).toFixed(1)}" font-size="10" fill="var(--accent-blue)" text-anchor="end">${escapeHtml(refLabel || "")}</text>`;
  })();

  // Con un solo versamento non c'e' un vero andamento da tracciare: un solo
  // punto evita di disegnare una linea/area fuorviante (sembrerebbe un trend).
  if (points.length === 1) {
    const cx = padding.left + chartW / 2;
    const cy = padding.top + chartH - (points[0].y / maxY) * chartH;
    return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet">
      ${refLine}
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="var(--accent-green)"/>
      <text x="${cx.toFixed(1)}" y="${(cy - 10).toFixed(1)}" font-size="10" fill="var(--text-muted)" text-anchor="middle">Primo versamento</text>
    </svg>`;
  }

  const minX = new Date(points[0].x).getTime();
  const maxX = new Date(points[points.length - 1].x).getTime();
  const spanX = Math.max(1, maxX - minX);

  const coords = points.map(p => [
    padding.left + ((new Date(p.x).getTime() - minX) / spanX) * chartW,
    padding.top + chartH - (p.y / maxY) * chartH,
  ]);

  const linePath = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + "," + c[1].toFixed(1)).join(" ");
  const areaPath = `${linePath} L${(padding.left + chartW).toFixed(1)},${(padding.top + chartH).toFixed(1)} L${padding.left.toFixed(1)},${(padding.top + chartH).toFixed(1)} Z`;

  return `<svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" preserveAspectRatio="xMidYMid meet">
    <path d="${areaPath}" fill="var(--accent-green-soft)" stroke="none"/>
    <path d="${linePath}" fill="none" stroke="var(--accent-green)" stroke-width="2"/>
    ${refLine}
  </svg>`;
}
