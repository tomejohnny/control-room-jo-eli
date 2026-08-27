import { createClient } from "@supabase/supabase-js";

// Feed iCal a sola lettura per lo Scadenziario, protetto da un token segreto
// in query string (Google Calendar non puo' fare login interattivo con
// Supabase Auth). Usa la service role key: bypassa RLS di proposito, solo
// lato server, mai esposta al client.

function escapeIcs(text) {
  return String(text ?? "").replace(/[\\,;]/g, m => "\\" + m).replace(/\r?\n/g, "\\n");
}

function icsDate(dateStr) {
  return String(dateStr).replaceAll("-", "");
}

function buildIcs(deadlines) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const events = deadlines.map(d => {
    const amount = Number(d.amount || 0).toLocaleString("it-IT", { minimumFractionDigits: 2 });
    return [
      "BEGIN:VEVENT",
      `UID:deadline-${d.id}@control-room-jo-eli`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(d.due_date)}`,
      `SUMMARY:${escapeIcs(`${d.title} (€ ${amount})`)}`,
      `DESCRIPTION:${escapeIcs(`Categoria: ${d.category || "-"} | Soggetto: ${d.subject || "-"} | Stato: ${d.status || "-"}`)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Family Holding Control Room//Scadenziario//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Scadenziario Family Holding",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export default async function handler(req, res) {
  const token = req.query?.token;
  if (!token || token !== process.env.CALENDAR_FEED_TOKEN) {
    res.status(403).send("Forbidden");
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    res.status(500).send("Configurazione mancante: VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("deadlines")
    .select("*")
    .neq("status", "Completato")
    .order("due_date", { ascending: true });

  if (error) {
    res.status(500).send("Errore nel recupero delle scadenze: " + error.message);
    return;
  }

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(buildIcs(data || []));
}
