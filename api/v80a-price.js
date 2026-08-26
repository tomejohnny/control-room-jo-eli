const TICKER = "V80A.DE";

export default async function handler(req, res) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ALPHA_VANTAGE_API_KEY non configurata su Vercel." });
    return;
  }

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${TICKER}&apikey=${apiKey}`
    );
    const data = await response.json();
    const price = data?.["Global Quote"]?.["05. price"];
    if (!price) {
      res.status(502).json({ error: "Alpha Vantage non ha restituito un prezzo valido." });
      return;
    }
    res.status(200).json({ price: parseFloat(price), ticker: TICKER });
  } catch (err) {
    res.status(502).json({ error: "Errore di connessione ad Alpha Vantage." });
  }
}
