import { apiRequest } from "./api.client";

type ExchangeRate = {
  rate: string;
  updated_at: string;
};

export function getExchangeRate(signal?: AbortSignal) {
  return apiRequest<{ exchangeRate: ExchangeRate | null }>(
    "/checkout/exchange-rate",
    { signal },
  );
}

export function updateExchangeRate(rate: string) {
  return apiRequest<{ exchangeRate: ExchangeRate }>("/checkout/exchange-rate", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rate }),
  });
}
