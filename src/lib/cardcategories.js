// Suggerimento automatico di categoria in base all'emittente/descrizione del
// movimento carta. Costruito il 01/09/2026 a partire dalle categorie che Jo
// ha assegnato a mano a tutti i 78 movimenti storici in `card_transactions`
// (query diretta su Supabase, non inventato) - riusa lo stesso nome di
// categoria che Jo ha gia' scelto per ciascun esercente, cosi' i nuovi
// movimenti che manda in futuro si autocompilano da soli nella maggior parte
// dei casi. Ordine dal piu' specifico al piu' generico: un match precoce
// vince, quindi le stringhe piu' particolari (nomi di negozio) stanno prima
// delle parole generiche.
//
// `excluded: true` significa che quell'esercente e' gia' tracciato altrove
// (Klarna, CapCut, Abbonamenti Gemini, Wind) - il suggerimento pre-spunta
// anche la casella "escluso dal ciclo" nel form, non solo la categoria.
const MERCHANT_RULES = [
  { match: "IMPOSTA DI BOLLO", category: "Imposta di bollo" },
  { match: "KLARNA", category: "Klarna (tracciato altrove)", excluded: true },
  { match: "CAPCUT", category: "Abbonamento (tracciato altrove)", excluded: true },
  { match: "PAYPAL *GOOGLE GOOGLE", category: "Abb Gemini", excluded: true },
  { match: "GOOGLE ONE", category: "Lavoro / Tech" },
  { match: "APPLE.COM/BILL", category: "Abbonamento" },
  { match: "MO* APPLE", category: "Abbonamento" },
  { match: "SKY ITALIA", category: "Abbonamento" },
  { match: "AMAZON MUSIC", category: "Abbonamento" },
  { match: "SEGUSINO N.C. OUTLET", category: "Abbigliamento Jo" },
  { match: "CARLO ALIPRANDI CARBUR", category: "Carburante" },
  { match: "DISTRIBUTORE BIOIL", category: "Carburante" },
  { match: "SERV ENI", category: "Carburante" },
  { match: "TERMOVENETA", category: "Carburante" },
  { match: "BRICOIO", category: "Casa" },
  { match: "ADOBE", category: "Lavoro / Tech" },
  { match: "CANVA", category: "Lavoro / Tech" },
  { match: "CLOUDFLARE", category: "Lavoro / Tech" },
  { match: "CLAUDE PRO", category: "Lavoro / Tech" },
  { match: "DALL'ARCHE MIRELLA", category: "Parrucchiera" },
  { match: "ASPIT", category: "Pedaggi" },
  { match: "BANCA DELLA MARCA", category: "Prelievo Bancomat" },
  { match: "FARMACIA", category: "Salute" },
  { match: "EMISFERO", category: "Spesa" },
  { match: "ALDI", category: "Spesa" },
  { match: "GLOBAL INGROSS", category: "Spesa" },
  { match: "LE CARNI COLOMBEROTTO", category: "Spesa" },
  { match: "LIDL", category: "Spesa" },
  { match: "MACELLERIA", category: "Spesa" },
  { match: "NEG 0448", category: "Spesa" },
  { match: "ORTOFRUTTA", category: "Spesa" },
  { match: "SUPERMERCATO", category: "Spesa" },
  { match: "46688 FOLLINA", category: "Svago" },
  { match: "BIRRIFICIO", category: "Svago" },
  { match: "CARIBE BAY", category: "Svago" },
  { match: "GELATERIA", category: "Svago" },
  { match: "IL VENTENNALE", category: "Svago" },
  { match: "MIHALI ILIUT RAZVAN", category: "Svago" },
  { match: "MUSICARTE", category: "Svago" },
  { match: "PIZZETTERIA", category: "Svago" },
  { match: "PRODOTTI SERVIZI WINDT", category: "Telefonia Eli", excluded: true },
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
