export type LiveConversionResult = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
  convertedAmount: number;
  rate: number;
  targetCurrency: string;
};

const FRANKFURTER_API_BASE = "https://api.frankfurter.dev/v2";

function normalizeCurrencyCode(value: string): string {
  return value.trim().toUpperCase();
}

export async function convertCurrencyLive(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<LiveConversionResult> {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than 0.");
  }

  if (!from || !to) {
    throw new Error("Both source and target currencies are required.");
  }

  if (from === to) {
    return {
      amount,
      base: from,
      date: new Date().toISOString().slice(0, 10),
      rates: { [to]: 1 },
      convertedAmount: amount,
      rate: 1,
      targetCurrency: to,
    };
  }

  const url = `${FRANKFURTER_API_BASE}/rates?base=${encodeURIComponent(from)}&quotes=${encodeURIComponent(to)}&amount=${encodeURIComponent(amount)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Live conversion request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
  };

  const rate = data.rates?.[to];

  if (typeof rate !== "number") {
    throw new Error("Target conversion rate was not returned.");
  }

  return {
    amount: data.amount,
    base: data.base,
    date: data.date,
    rates: data.rates,
    convertedAmount: rate,
    rate: rate / amount,
    targetCurrency: to,
  };
}
