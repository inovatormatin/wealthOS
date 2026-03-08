const Anthropic = require("@anthropic-ai/sdk");

// Step 1 — Yahoo Finance (unofficial, free, no key)
async function fetchFromYahoo(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.NS?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);
  const data = await res.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price) throw new Error("No price in Yahoo response");
  return price;
}

// Step 2 — Alpha Vantage (25 free calls/day)
async function fetchFromAlphaVantage(ticker) {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key) throw new Error("No Alpha Vantage key configured");
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=NSE:${ticker}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage returned ${res.status}`);
  const data = await res.json();
  const price = parseFloat(data?.["Global Quote"]?.["05. price"]);
  if (!price || isNaN(price)) throw new Error("No price in Alpha Vantage response");
  return price;
}

// Step 3 — Claude AI with web search
async function fetchFromClaude(ticker) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("No Anthropic API key configured");

  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [
      {
        role: "user",
        content: `What is the latest closing price of NSE stock ticker "${ticker}" in INR? Reply with only the numeric price, no currency symbol or text.`,
      },
    ],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join(" ");

  const match = text.match(/[\d,]+\.?\d*/);
  if (!match) throw new Error("Could not parse price from Claude response");
  const price = parseFloat(match[0].replace(/,/g, ""));
  if (!price || isNaN(price)) throw new Error("Invalid price from Claude");
  return price;
}

// Main export — runs fallback chain, only for stock tickers
async function fetchStockPrice(ticker) {
  try {
    const price = await fetchFromYahoo(ticker);
    console.log(`[price] ${ticker} from Yahoo: ₹${price}`);
    return { price, source: "yahoo" };
  } catch (err) {
    console.log(`[price] Yahoo failed for ${ticker}: ${err.message}`);
  }

  try {
    const price = await fetchFromAlphaVantage(ticker);
    console.log(`[price] ${ticker} from Alpha Vantage: ₹${price}`);
    return { price, source: "alpha_vantage" };
  } catch (err) {
    console.log(`[price] Alpha Vantage failed for ${ticker}: ${err.message}`);
  }

  try {
    const price = await fetchFromClaude(ticker);
    console.log(`[price] ${ticker} from Claude AI: ₹${price}`);
    return { price, source: "ai" };
  } catch (err) {
    console.log(`[price] Claude failed for ${ticker}: ${err.message}`);
  }

  return null;
}

module.exports = { fetchStockPrice };
