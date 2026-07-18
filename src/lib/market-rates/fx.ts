// src/lib/market-rates/fx.ts
// نرخ‌های جهانی FX از exchangerate-api.com (رایگان، بدون کلید).

const EXR_BASE = 'https://api.exchangerate-api.com/v4/latest/USD';
const REQUEST_TIMEOUT_MS = 8_000;

export interface FxMap {
  [currency: string]: number;
}

export async function getGlobalFxRates(): Promise<FxMap | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(EXR_BASE, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': 'Biotak/1.0' },
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json = (await res.json()) as { rates?: FxMap };
    return json?.rates ?? null;
  } catch {
    clearTimeout(t);
    return null;
  }
}
