// Proxy generico verso Alpha Vantage: la chiave resta server-side.
// Uso: /api/etf-price?symbol=XNAS.DE

export default async function handler(req, res) {
  const symbol = req.query?.symbol;
  if (!symbol) {
    res.status(400).json({ error: "Parametro symbol mancante." });
    return;
  }

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ALPHA_VANTAGE_API_KEY non configurata su Vercel." });
    return;
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`
    );
    const data = await response.json();
    const price = data?.["Global Quote"]?.["05. price"];
    if (!price) {
      res.status(502).json({ error: `Alpha Vantage non ha restituito un prezzo valido per ${symbol}.` });
      return;
    }
    res.status(200).json({ price: parseFloat(price), symbol });
  } catch (err) {
    res.status(502).json({ error: "Errore di connessione ad Alpha Vantage." });
  }
}
