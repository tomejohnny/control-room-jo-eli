import "./styles.css";
import { supabase } from "./supabase.js";

const status = document.createElement("div");
status.id = "supabase-status";
status.style.cssText =
  "position:fixed;right:16px;bottom:16px;z-index:9999;padding:10px 14px;border-radius:8px;background:#172033;color:#fff;font:14px system-ui;box-shadow:0 4px 18px rgba(0,0,0,.3)";
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
  return document.querySelectorAll("table")[0] || null;
}

function showError(message) {
  status.textContent = `Supabase: ${message}`;
  status.style.background = "#b42318";
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
        <td>
          <button class="delete-db-row" data-id="${escapeHtml(row.id)}">
            Elimina
          </button>
        </td>
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

function openMovementForm() {
  if (document.querySelector("#db-movement-form")) return;

  const form = document.createElement("form");
  form.id = "db-movement-form";
  form.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;background:#172033;color:#fff;padding:24px;border-radius:12px;width:360px;box-shadow:0 10px 40px rgba(0,0,0,.5);font:14px system-ui";

  form.innerHTML = `
    <h3 style="margin-top:0">Nuovo movimento</h3>

    <label>Data</label>
    <input name="movement_date" type="date" required
      style="width:100%;margin:6px 0 12px;padding:8px">

    <label>Descrizione</label>
    <input name="description" type="text" required
      style="width:100%;margin:6px 0 12px;padding:8px">

    <label>Soggetto</label>
    <input name="subject" type="text" value="Famiglia" required
      style="width:100%;margin:6px 0 12px;padding:8px">

    <label>Tipo</label>
    <select name="movement_type" required
      style="width:100%;margin:6px 0 12px;padding:8px">
      <option value="ENTRATA">ENTRATA</option>
      <option value="USCITA">USCITA</option>
    </select>

    <label>Importo</label>
    <input name="amount" type="number" min="0" step="0.01" required
      style="width:100%;margin:6px 0 12px;padding:8px">

    <label>Conto</label>
    <input name="account" type="text" value="Banca della Marca"
      style="width:100%;margin:6px 0 12px;padding:8px">

    <div style="display:flex;gap:8px;margin-top:16px">
      <button type="submit">Salva</button>
      <button type="button" id="cancel-db-movement">Annulla</button>
    </div>
  `;

  document.body.appendChild(form);

  form.querySelector("#cancel-db-movement").addEventListener("click", () => {
    form.remove();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const values = new FormData(form);

    const payload = {
      movement_date: values.get("movement_date"),
      description: values.get("description"),
      subject: values.get("subject"),
      movement_type: values.get("movement_type"),
      amount: Number(values.get("amount")),
      account: values.get("account"),
      status: "Registrato"
    };

    const { error } = await supabase
      .from("cash_movements")
      .insert(payload);

    if (error) {
      showError(error.message);
      return;
    }

    form.remove();
    await loadMovements();
  });
}

function connectOriginalAddButton() {
  const buttons = [...document.querySelectorAll("button")];
  const button = buttons.find((item) =>
    item.innerText.trim().includes("Movimento")
  );

  if (button) {
    button.addEventListener("click", openMovementForm);
  }
}

connectOriginalAddButton();
loadMovements();
