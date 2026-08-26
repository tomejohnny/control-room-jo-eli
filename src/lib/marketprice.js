export async function fetchLivePrice(ticker) {
  const response = await fetch(`/api/etf-price?symbol=${encodeURIComponent(ticker)}`);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.price) {
    throw new Error(data?.error || "Impossibile recuperare il prezzo live.");
  }
  return data.price;
}
