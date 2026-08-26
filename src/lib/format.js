export function money(value) {
  const n = Number(value || 0);
  return (n < 0 ? "- " : "") + "€ " + Math.abs(n).toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function isSameMonth(dateStr, ref = new Date()) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
