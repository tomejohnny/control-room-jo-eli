import "./styles.css";
import { supabase } from "./supabase.js";

const status = document.createElement("div");
status.id = "supabase-status";
status.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:9999;padding:10px 14px;border-radius:8px;background:#172033;color:#fff;font:14px system-ui;box-shadow:0 4px 18px rgba(0,0,0,.3)";
document.body.appendChild(status);

async function testSupabase() {
  status.textContent = "Collegamento Supabase in corso...";
  status.style.background = "#172033";

  const { error } = await supabase
    .from("cash_movements")
    .select("id")
    .limit(1);

  if (error) {
    console.error("Supabase error:", error);
    status.textContent = `Supabase: ${error.message}`;
    status.style.background = "#b42318";
    return;
  }

  status.textContent = "Supabase collegato";
  status.style.background = "#087443";
  setTimeout(() => status.remove(), 3500);
}

testSupabase();
