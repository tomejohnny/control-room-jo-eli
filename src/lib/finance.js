// Formule KPI/Risk/Treasury, derivate interamente dai dati Supabase.
// Le categorie (fixed_expenses.category / deadlines.category) sono testo libero:
// il filtro "contiene 'debito'" o "contiene 'fisco'" e' un'euristica sul dato
// reale attuale, non una regola rigida - va aggiustata se cambia la nomenclatura.

export function bankBalance(cashMovements) {
  return cashMovements.reduce((sum, m) => {
    const amount = Number(m.amount || 0);
    return sum + (m.movement_type === "ENTRATA" ? amount : -amount);
  }, 0);
}

export function monthEndMargin(cashMovements, deadlines, ref = new Date()) {
  const balance = bankBalance(cashMovements);
  const pending = deadlines
    .filter(d => d.status !== "Completato" && sameMonth(d.due_date, ref))
    .reduce((sum, d) => sum + Number(d.amount || 0), 0);
  return balance - pending;
}

export function totalMonthlyFixedExpenses(fixedExpenses) {
  return fixedExpenses.filter(f => f.active !== false).reduce((sum, f) => sum + Number(f.amount || 0), 0);
}

export function totalMonthlyIncome(recurringIncome) {
  return recurringIncome.filter(i => i.active !== false).reduce((sum, i) => sum + Number(i.monthly_amount || 0), 0);
}

export function liquidityMonths(cashMovements, fixedExpenses) {
  const burn = totalMonthlyFixedExpenses(fixedExpenses);
  if (burn <= 0) return null;
  return bankBalance(cashMovements) / burn;
}

export function dscr(recurringIncome, fixedExpenses) {
  const debtService = fixedExpenses
    .filter(f => f.active !== false && String(f.category || "").toLowerCase().includes("debito"))
    .reduce((sum, f) => sum + Number(f.amount || 0), 0);
  if (debtService <= 0) return null;
  return totalMonthlyIncome(recurringIncome) / debtService;
}

export function quarterlyTreasury(recurringIncome, fixedExpenses, deadlines, quarters = 4, ref = new Date()) {
  const monthlyIncome = totalMonthlyIncome(recurringIncome);
  const monthlyExpense = totalMonthlyFixedExpenses(fixedExpenses);
  const result = [];
  for (let q = 0; q < quarters; q++) {
    const startMonth = ref.getMonth() + q * 3;
    const start = new Date(ref.getFullYear(), startMonth, 1);
    const end = new Date(ref.getFullYear(), startMonth + 3, 0);
    const oneOff = deadlines
      .filter(d => d.status !== "Completato" && inRange(d.due_date, start, end))
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const income = monthlyIncome * 3;
    const expense = monthlyExpense * 3 + oneOff;
    result.push({
      label: quarterLabel(start, end),
      income,
      expense,
      net: income - expense,
    });
  }
  return result;
}

function sameMonth(dateStr, ref) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

function inRange(dateStr, start, end) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d <= end;
}

function quarterLabel(start, end) {
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${months[start.getMonth()]} - ${months[end.getMonth()]} ${end.getFullYear()}`;
}
