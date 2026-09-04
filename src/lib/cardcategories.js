// Suggerimento automatico di categoria in base all'emittente/descrizione del
// movimento carta. Costruito il 01/09/2026 a partire dalle categorie che Jo
// ha assegnato a mano ai movimenti storici in `card_transactions`, poi
// riallineato il 04/09/2026 alla tassonomia canonica di categories.js (Jo ha
// unificato le categorie carta con quelle del Master Budget: i vecchi nomi
// come "Spesa", "Carburante", "Svago" non esistono piu'). Ordine dal piu'
// specifico al piu' generico: un match precoce vince, quindi le stringhe
// piu' particolari (nomi di negozio) stanno prima delle parole generiche.
//
// `excluded: true` significa che quell'esercente e' gia' tracciato altrove
// (Klarna, CapCut, Google Gemini, Wind) - il suggerimento pre-spunta anche
// la casella "escluso dal ciclo" nel form, non solo la categoria.
//
// MOONEY e IMPOSTA DI BOLLO erano nell'elenco storico ma non hanno un
// corrispettivo canonico non ambiguo (Mooney processa qualsiasi bolletta
// pagoPA - potrebbe essere Enel, Acqua o Rifiuti a seconda del caso; Imposta
// di bollo non e' ne' una spesa reale ne' una delle 4 voci amministrative) -
// rimossi dal suggerimento automatico finche' Jo non decide dove mapparli,
// invece di indovinare e proporre una categoria sbagliata.
const MERCHANT_RULES = [
  { match: "KLARNA", category: "Debito / Klarna (tracciato altrove)", excluded: true },
  { match: "CAPCUT", category: "Abbonamento (tracciato altrove)", excluded: true },
  { match: "PAYPAL *GOOGLE GOOGLE", category: "Abbonamento (tracciato altrove)", excluded: true },
  { match: "PRODOTTI SERVIZI WINDT", category: "Abbonamento (tracciato altrove)", excluded: true },
  { match: "GOOGLE ONE", category: "Lavoro/Tech - Spese Variabili" },
  { match: "APPLE.COM/BILL", category: "Lavoro/Tech - Spese Variabili" },
  { match: "MO* APPLE", category: "Lavoro/Tech - Spese Variabili" },
  { match: "ADOBE", category: "Lavoro/Tech - Spese Variabili" },
  { match: "CANVA", category: "Lavoro/Tech - Spese Variabili" },
  { match: "CLOUDFLARE", category: "Lavoro/Tech - Spese Variabili" },
  { match: "CLAUDE PRO", category: "Lavoro/Tech - Spese Variabili" },
  { match: "SKY ITALIA", category: "Svago & Tempo Libero" },
  { match: "AMAZON MUSIC", category: "Svago & Tempo Libero" },
  { match: "46688 FOLLINA", category: "Svago & Tempo Libero" },
  { match: "BIRRIFICIO", category: "Svago & Tempo Libero" },
  { match: "CARIBE BAY", category: "Svago & Tempo Libero" },
  { match: "GELATERIA", category: "Svago & Tempo Libero" },
  { match: "IL VENTENNALE", category: "Svago & Tempo Libero" },
  { match: "MIHALI ILIUT RAZVAN", category: "Svago & Tempo Libero" },
  { match: "MUSICARTE", category: "Svago & Tempo Libero" },
  { match: "PIZZETTERIA", category: "Svago & Tempo Libero" },
  { match: "SEGUSINO N.C. OUTLET", category: "Abbigliamento" },
  { match: "CARLO ALIPRANDI CARBUR", category: "Mobilità" },
  { match: "DISTRIBUTORE BIOIL", category: "Mobilità" },
  { match: "SERV ENI", category: "Mobilità" },
  { match: "TERMOVENETA", category: "Mobilità" },
  { match: "ASPIT", category: "Mobilità" },
  { match: "BRICOIO", category: "Casa - Manutenzione Ordinaria & Beni" },
  { match: "DALL'ARCHE MIRELLA", category: "Cura Personale" },
  { match: "BANCA DELLA MARCA", category: "Prelievo Bancomat" },
  { match: "FARMACIA", category: "Salute" },
  { match: "EMISFERO", category: "Alimentari & Casa" },
  { match: "ALDI", category: "Alimentari & Casa" },
  { match: "GLOBAL INGROSS", category: "Alimentari & Casa" },
  { match: "LE CARNI COLOMBEROTTO", category: "Alimentari & Casa" },
  { match: "LIDL", category: "Alimentari & Casa" },
  { match: "MACELLERIA", category: "Alimentari & Casa" },
  { match: "NEG 0448", category: "Alimentari & Casa" },
  { match: "ORTOFRUTTA", category: "Alimentari & Casa" },
  { match: "SUPERMERCATO", category: "Alimentari & Casa" },
];

// Ritorna { category, excluded } se un esercente noto viene riconosciuto
// nella descrizione, altrimenti null. Match case-insensitive, per
// sottostringa (le descrizioni reali degli estratti conto hanno sempre
// codici POS/citta' variabili in coda, es. "LIDL 1263 SACILE ITA").
export function guessCategory(description) {
  if (!description) return null;
  const upper = String(description).toUpperCase();
  for (const rule of MERCHANT_RULES) {
    if (upper.includes(rule.match.toUpperCase())) {
      return { category: rule.category, excluded: !!rule.excluded };
    }
  }
  return null;
}

export { MERCHANT_RULES };
