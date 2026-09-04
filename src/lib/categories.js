// Tassonomia canonica delle categorie di spesa carta (card_transactions),
// unificata da Jo con le categorie del Master Budget (tier "Variabile
// Stimato") il 04/09/2026. Fonte unica: ogni punto dell'app che assegna o
// mostra una categoria di movimento carta importa da qui - non duplicare
// l'elenco altrove. Lo schema Supabase non cambia (category resta testo
// libero lato DB): il vincolo alla lista e' solo qui, lato UI.

export const SPESA_REALE_CATEGORIES = [
  "Alimentari & Casa",
  "Utenze Casa - Enel",
  "Utenze Casa - Acqua",
  "Utenze Casa - Rifiuti",
  "Mobilità",
  "Salute",
  "Cura Personale",
  "Abbigliamento",
  "Svago & Tempo Libero",
  "Animali",
  "Figlie - Mensa",
  "Figlie - Sport",
  "Figlie - Materiale Scolastico & Varie",
  "Casa - Manutenzione Ordinaria & Beni",
  "Lavoro/Tech - Spese Variabili",
  "Spese Varie/Impreviste",
];

// Non sono spesa vera (tracciate/gestite altrove) ma servono comunque come
// categoria per movimenti tipo prelievi o rate.
export const AMMINISTRATIVE_CATEGORIES = [
  "Prelievo Bancomat",
  "Debito / Klarna (tracciato altrove)",
  "Debito / PayPal Paga3",
  "Abbonamento (tracciato altrove)",
  "Commissioni Bancarie e Bollo",
];

export const CARD_CATEGORIES = [...SPESA_REALE_CATEGORIES, ...AMMINISTRATIVE_CATEGORIES];

export function isCanonicalCategory(value) {
  return CARD_CATEGORIES.includes(value);
}
