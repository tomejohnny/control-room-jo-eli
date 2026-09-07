// Proxy verso Yahoo Finance per il prezzo corrente di un ticker.
// Uso: /api/etf-price?symbol=XNAS.DE
//
// Migrato da Alpha Vantage il 07/09/2026: il piano gratuito di Alpha Vantage
// non ha copertura live per i ticker XETRA (.DE) usati in questa app -
// VWCE.DE restituiva sempre lo stesso prezzo statico (coincideva esattamente
// col previousClose, mai col prezzo del giorno), XNAS.DE non aveva dati
// affatto. Verificato con Yahoo che entrambi i ticker hanno un
// regularMarketPrice live e diverso dal previousClose.
//
// ATTENZIONE: query1.finance.yahoo.com/v8/finance/chart e' un endpoint
// pubblico NON documentato/non ufficiale di Yahoo Finance (nessuna API key,
// nessun accordo di servizio) - puo' cambiare formato o essere bloccato
// senza preavviso. Se smette di funzionare, "Modifica Manuale" nel tab
// Ambra & Bianca / Capex & PAC resta la rete di sicurezza gia' esistente -
// non serve un altro fallback automatico qui.
export default async function handler(req, res) {
  const symbol = req.query?.symbol;
  if (!symbol) {
    res.status(400).json({ error: "Parametro symbol mancante." });
    return;
  }

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      // Senza uno User-Agent da browser, Yahoo a volte rifiuta la richiesta
      // (endpoint pensato per il loro frontend, non per consumo da API).
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
    );
    if (!response.ok) {
      res.status(502).json({ error: `Yahoo Finance ha risposto con errore HTTP ${response.status} per ${symbol}.` });
      return;
    }
    const data = await response.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (typeof price !== "number") {
      res.status(502).json({ error: `Yahoo Finance non ha restituito un prezzo valido per ${symbol}.` });
      return;
    }
    res.status(200).json({ price, symbol });
  } catch (err) {
    res.status(502).json({ error: "Errore di connessione a Yahoo Finance." });
  }
}
