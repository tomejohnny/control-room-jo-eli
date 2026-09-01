// Propone i movimenti di cassa attesi per un mese, a partire da Master
// Budget/Entrate Fisse. Le righe risultanti hanno status "Previsto": non
// contano nei saldi (vedi finance.js) finche' l'utente non le conferma
// (con "Conferma" o modificandole - il salvataggio le promuove sempre a
// "Registrato").

function normalize(text) {
  return String(text || "").trim().toLowerCase();
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function clampDay(day, year, month0) {
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const d = Number(day) || 1;
  return Math.min(Math.max(d, 1), lastDay);
}

export function planMonthlyMovements(fixedExpenses, recurringIncome, existingMovements, month) {
  const [year, monthNum] = month.split("-").map(Number);
  const month0 = monthNum - 1;

  const existingDescriptions = new Set(
    existingMovements
      .filter(m => String(m.movement_date || "").startsWith(month))
      .map(m => normalize(m.description))
  );

  const plans = [];

  fixedExpenses
    // Le voci con paid_by_card=true (es. Sky, Google One, Claude Pro, Amazon
    // Music: abbonamenti Fisso Certo ma addebitati sulla carta di credito)
    // non generano un movimento mensile separato: il loro impatto di cassa
    // e' gia' incluso nella liquidazione aggregata del ciclo carta
    // (deadlines, categoria "Carta di Credito"). Generarlo anche qui
    // conterebbe la stessa spesa due volte.
    .filter(f => f.active !== false && !f.paid_by_card && !existingDescriptions.has(normalize(f.description)))
    .forEach(f => {
      const day = clampDay(f.due_day, year, month0);
      plans.push({
        movement_date: `${year}-${pad(monthNum)}-${pad(day)}`,
        description: f.description,
        subject: f.subject,
        movement_type: "USCITA",
        amount: Number(f.amount || 0),
        account: null,
        category: f.category || null,
        status: "Previsto",
      });
    });

  recurringIncome
    .filter(i => i.active !== false && !existingDescriptions.has(normalize(i.description)))
    .forEach(i => {
      plans.push({
        movement_date: `${year}-${pad(monthNum)}-01`,
        description: i.description,
        subject: i.subject,
        movement_type: "ENTRATA",
        amount: Number(i.monthly_amount || 0),
        account: null,
        category: null,
        status: "Previsto",
      });
    });

  return plans;
}
