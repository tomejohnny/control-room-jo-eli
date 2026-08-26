import { listRows } from "./db.js";

const state = {
  cashMovements: [],
  fixedExpenses: [],
  recurringIncome: [],
  deadlines: [],
  investments: [],
  investmentTransactions: [],
};

export function getState() {
  return state;
}

export async function loadAll() {
  const [cashMovements, fixedExpenses, recurringIncome, deadlines, investments, investmentTransactions] = await Promise.all([
    listRows("cash_movements", { orderBy: "movement_date", ascending: false }),
    listRows("fixed_expenses", { orderBy: "description" }),
    listRows("recurring_income", { orderBy: "description" }),
    listRows("deadlines", { orderBy: "due_date" }),
    listRows("investments", { orderBy: "name" }),
    listRows("investment_transactions", { orderBy: "transaction_date", ascending: false }),
  ]);
  state.cashMovements = cashMovements;
  state.fixedExpenses = fixedExpenses;
  state.recurringIncome = recurringIncome;
  state.deadlines = deadlines;
  state.investments = investments;
  state.investmentTransactions = investmentTransactions;
  return state;
}
