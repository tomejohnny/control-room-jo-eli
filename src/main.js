import "./styles.css";
import { supabase } from "./supabase.js";

const status = document.createElement("div");
status.id = "supabase-status";
status.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;padding:10px 14px;border-radius:8px;background:#172033;color:#fff;font:14px system-ui;box-shadow:0 4px 18px rgba(0,0,0,.3)";
document.body.appendChild(status);

function money(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCashFlowTable() {
  const tables = [...document.querySelectorAll("table")];
  return tables[0] || null;
}

function renderMovements(rows) {
  const table = getCashFlowTable();
  if (!table) {
    showError("Tabella Cash Flow non trovata");
    return;
  }

  let body = table.querySelector("tbody");
  if (!body) {
    body = document.createElement("tbody");
    table.appendChild(body);
  }

  body.innerHTML = rows.map((row) => {
    const income = row.movement_type === "ENTRATA";
    const sign = income ? "+" : "-";
    const typeClass = income ? "income" : "expense";

    return `
      <tr data-db-id="${escapeHtml(row.id)}">
        <td>${escapeHtml(row.movement_date)}</td>
        <td>${escapeHtml(row.description)}</td>
        <td>${escapeHtml(row.subject)}</td>
        <td><span class="badge ${typeClass}">${escapeHtml(row.movement_type)}</span></td>
        <td class="amount ${typeClass}">${sign} ${money(row.amount)}</td>
        <td><button class="delete-db-row" data-id="${escapeHtml(row.id)}">Elimina</button></td>
      </tr>
    `;
  }).join("");

  body.querySelectorAll(".delete-db-row").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.id;
      if (!confirm("Eliminare questo movimento?")) return;

      button.disabled = true;

      const { error } = await supabase
        .from("cash_movements")
        .delete()
        .eq("id", id);

      if (error) {
        showError(error.message);
        button.disabled = false;
        return;
      }

      await loadMovements();
    });
  });
}

function showError(message) {
  status.textContent = `Supabase: ${message}`;
  status.style.background = "#b42318";
}

async function loadMovements() {
  status.textContent = "Caricamento movimenti...";
  status.style.background = "#172033";

  const { data, error } = await supabase
    .from("cash_movements")
    .select("*")
    .order("movement_date", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    showError(error.message);
    return;
  }

  renderMovements(data || []);
  status.textContent = `Supabase collegato · ${data?.length || 0} movimenti`;
  status.style.background = "#087443";
}

loadMovements();
