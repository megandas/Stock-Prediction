/**
 * SignalEdge — Stock Data Module
 *
 * Primary: Twelve Data (800 calls/day, 8/min, 100+ indicators)
 * Fallback: Yahoo Finance (unofficial, 15-min delay, no SLA)
 *
 * All fetching is server-side only. Never import this module in client code.
 */

import YahooFinance from "yahoo-finance2";

// v4+ requires instantiation
const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey", "ripHistorical"],
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  /** ISO timestamp of when the quote was fetched */
  fetchedAt: string;
}

export interface OHLCV {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Fundamentals {
  symbol: string;
  marketCap: number | null;
  peRatio: number | null;
  eps: number | null;
  revenue: number | null;
  sector: string | null;
}

export interface IndicatorResult {
  symbol: string;
  indicator: string;
  params: Record<string, unknown>;
  values: Record<string, number | null>[];
}

export class StockDataError extends Error {
  constructor(
    message: string,
    public readonly code: "API_KEY_MISSING" | "RATE_LIMITED" | "API_ERROR" | "NOT_FOUND" | "ALL_DOWN",
    public readonly source?: string,
  ) {
    super(message);
    this.name = "StockDataError";
  }
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const QUOTE_TTL = 60_000; // 60 seconds
const HISTORICAL_TTL = 5 * 60_000; // 5 minutes
const FUNDAMENTALS_TTL = 30 * 60_000; // 30 minutes
const INDICATOR_TTL = 60_000; // 60 seconds

// ---------------------------------------------------------------------------
// Rate Limiting (8 calls/minute for Twelve Data)
// ---------------------------------------------------------------------------

const MAX_CALLS_PER_MINUTE = 8;
const RATE_WINDOW_MS = 60_000;

const twelveDataCallTimestamps: number[] = [];

function enforceRateLimit(): void {
  const now = Date.now();
  // Remove timestamps outside the window
  while (
    twelveDataCallTimestamps.length > 0 &&
    twelveDataCallTimestamps[0] < now - RATE_WINDOW_MS
  ) {
    twelveDataCallTimestamps.shift();
  }
  if (twelveDataCallTimestamps.length >= MAX_CALLS_PER_MINUTE) {
    console.warn(
      `[stock-data] Twelve Data rate limit hit (${MAX_CALLS_PER_MINUTE}/min). Queueing...`,
    );
    throw new StockDataError(
      "Twelve Data rate limit reached — try again shortly",
      "RATE_LIMITED",
      "twelvedata",
    );
  }
  twelveDataCallTimestamps.push(now);
}

// ---------------------------------------------------------------------------
// Twelve Data client (lazy init)
// ---------------------------------------------------------------------------

let _twelveDataClient: Awaited<ReturnType<typeof createTwelveDataClient>> | null = null;

async function createTwelveDataClient() {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) {
    return null;
  }
  const twelvedata = (await import("twelvedata")).default;
  return twelvedata({ key });
}

async function getTwelveDataClient() {
  if (_twelveDataClient === null) {
    _twelveDataClient = await createTwelveDataClient();
  }
  return _twelveDataClient;
}

// ---------------------------------------------------------------------------
// API call helpers
// ---------------------------------------------------------------------------

/**
 * Try a Twelve Data call with rate limiting and error handling.
 * Returns null if the call cannot be made (no key, rate limited, or API error).
 */
async function tryTwelveData<T>(
  fn: (client: NonNullable<Awaited<ReturnType<typeof getTwelveDataClient>>>) => Promise<T>,
): Promise<T | null> {
  const client = await getTwelveDataClient();
  if (!client) {
    console.warn("[stock-data] TWELVE_DATA_API_KEY not set — skipping Twelve Data");
    return null;
  }
  try {
    enforceRateLimit();
    return await fn(client);
  } catch (err) {
    if (err instanceof StockDataError && err.code === "RATE_LIMITED") {
      throw err; // propagate to trigger fallback
    }
    console.warn("[stock-data] Twelve Data call failed:", (err as Error).message);
    return null;
  }
}

/**
 * Try a Yahoo Finance call, returning null on failure.
 */
async function tryYahooFinance<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn("[stock-data] Yahoo Finance call failed:", (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get a real-time quote for a stock symbol.
 */
export async function getQuote(symbol: string): Promise<Quote> {
  const normalized = symbol.toUpperCase();
  const cacheKey = `quote:${normalized}`;
  const cached = cacheGet<Quote>(cacheKey);
  if (cached) return cached;

  // Primary: Twelve Data
  const tdResult = await tryTwelveData(async (client) => {
    const data = await client.quote({ symbol: normalized });
    // Twelve Data quote response shape: { symbol, open, high, low, price, volume, change, change_percent, previous_close }
    return {
      symbol: data.symbol ?? normalized,
      price: Number(data.price ?? 0),
      change: Number(data.change ?? 0),
      changePercent: Number(data.change_percent ?? 0),
      volume: Number(data.volume ?? 0),
      high: Number(data.high ?? 0),
      low: Number(data.low ?? 0),
      open: Number(data.open ?? 0),
      prevClose: Number(data.previous_close ?? 0),
      fetchedAt: new Date().toISOString(),
    } satisfies Quote;
  });

  if (tdResult) {
    cacheSet(cacheKey, tdResult, QUOTE_TTL);
    return tdResult;
  }

  // Fallback: Yahoo Finance
  const yfResult = await tryYahooFinance(async () => {
    const data = await yahooFinance.quote(normalized);
    return {
      symbol: data.symbol ?? normalized,
      price: data.regularMarketPrice ?? 0,
      change: data.regularMarketChange ?? 0,
      changePercent: data.regularMarketChangePercent ?? 0,
      volume: data.regularMarketVolume ?? 0,
      high: data.regularMarketDayHigh ?? 0,
      low: data.regularMarketDayLow ?? 0,
      open: data.regularMarketOpen ?? 0,
      prevClose: data.regularMarketPreviousClose ?? 0,
      fetchedAt: new Date().toISOString(),
    } satisfies Quote;
  });

  if (yfResult) {
    cacheSet(cacheKey, yfResult, QUOTE_TTL);
    return yfResult;
  }

  throw new StockDataError(
    `Failed to fetch quote for ${normalized} — both APIs unavailable`,
    "ALL_DOWN",
  );
}

/**
 * Get historical OHLCV data for a symbol.
 */
export async function getHistorical(
  symbol: string,
  interval: "1d" | "1wk" | "1mo" = "1d",
  range: "1mo" | "3mo" | "6mo" | "1y" = "1mo",
): Promise<OHLCV[]> {
  const normalized = symbol.toUpperCase();
  const cacheKey = `historical:${normalized}:${interval}:${range}`;
  const cached = cacheGet<OHLCV[]>(cacheKey);
  if (cached) return cached;

  // Primary: Twelve Data
  const tdResult = await tryTwelveData(async (client) => {
    const data = await client.timeSeries({
      symbol: normalized,
      interval,
      outputsize: rangeToOutputSize(range),
    });
    // Twelve Data timeSeries returns { values: [...] }
    const values = data.values ?? data;
    if (!Array.isArray(values)) throw new Error("Unexpected timeSeries response shape");
    return values.map((row: Record<string, unknown>) => ({
      date: String(row.datetime ?? ""),
      open: Number(row.open ?? 0),
      high: Number(row.high ?? 0),
      low: Number(row.low ?? 0),
      close: Number(row.close ?? 0),
      volume: Number(row.volume ?? 0),
    })) satisfies OHLCV[];
  });

  if (tdResult) {
    cacheSet(cacheKey, tdResult, HISTORICAL_TTL);
    return tdResult;
  }

  // Fallback: Yahoo Finance
  const yfResult = await tryYahooFinance(async () => {
    const period1 = rangeToDate(range);
    const period2 = new Date();
    const data = await yahooFinance.historical(normalized, {
      period1,
      period2,
      interval: intervalToYfInterval(interval),
    });
    return data.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      open: row.open ?? 0,
      high: row.high ?? 0,
      low: row.low ?? 0,
      close: row.close ?? 0,
      volume: row.volume ?? 0,
    })) satisfies OHLCV[];
  });

  if (yfResult) {
    cacheSet(cacheKey, yfResult, HISTORICAL_TTL);
    return yfResult;
  }

  throw new StockDataError(
    `Failed to fetch historical data for ${normalized} — both APIs unavailable`,
    "ALL_DOWN",
  );
}

/**
 * Get a technical indicator value for a symbol.
 */
export async function getIndicator(
  symbol: string,
  indicator: "sma" | "ema" | "rsi" | "macd",
  params: Record<string, unknown> = {},
): Promise<IndicatorResult> {
  const normalized = symbol.toUpperCase();
  const cacheKey = `indicator:${normalized}:${indicator}:${JSON.stringify(params)}`;
  const cached = cacheGet<IndicatorResult>(cacheKey);
  if (cached) return cached;

  // Only Twelve Data supports indicators natively
  const tdResult = await tryTwelveData(async (client) => {
    const data = await client.technicalIndicators({
      symbol: normalized,
      indicator: indicator === "macd" ? "macd" : indicator,
      ...params,
    });
    const values = data.values ?? data;
    const valuesArr = Array.isArray(values) ? values : [values];
    return {
      symbol: normalized,
      indicator,
      params,
      values: valuesArr.map((v: Record<string, unknown>) => {
        const out: Record<string, number | null> = {};
        for (const [k, val] of Object.entries(v)) {
          if (k === "datetime") continue;
          out[k] = val != null ? Number(val) : null;
        }
        return out;
      }),
    } satisfies IndicatorResult;
  });

  if (tdResult) {
    cacheSet(cacheKey, tdResult, INDICATOR_TTL);
    return tdResult;
  }

  // Fallback: Yahoo Finance does not have built-in indicators.
  // We could compute simple ones (SMA) from historical data ourselves.
  if (indicator === "sma") {
    const period = (params.period as number) ?? (params.time_period as number) ?? 20;
    try {
      const hist = await getHistorical(normalized, "1d", "1mo");
      const closes = hist.map((h) => h.close);
      const smaValues = computeSMA(closes, period);
      const result: IndicatorResult = {
        symbol: normalized,
        indicator: "sma",
        params: { period },
        values: smaValues.map((val, i) => ({
          sma: val,
          date: hist[i]?.date ?? "",
        })),
      };
      cacheSet(cacheKey, result, INDICATOR_TTL);
      return result;
    } catch {
      // Fall through to error
    }
  }

  throw new StockDataError(
    `Failed to fetch indicator ${indicator} for ${normalized} — Twelve Data unavailable and no fallback for this indicator`,
    "ALL_DOWN",
  );
}

/**
 * Get fundamental data for a symbol.
 */
export async function getFundamentals(symbol: string): Promise<Fundamentals> {
  const normalized = symbol.toUpperCase();
  const cacheKey = `fundamentals:${normalized}`;
  const cached = cacheGet<Fundamentals>(cacheKey);
  if (cached) return cached;

  // Primary: Twelve Data (via complexData or statistics)
  const tdResult = await tryTwelveData(async (client) => {
    // Twelve Data's statistics endpoint for fundamentals
    const data = await client.complexData({
      symbol: normalized,
      method: "statistics",
    });
    // The shape varies — extract what we can
    const stats = data.statistics ?? data;
    return {
      symbol: normalized,
      marketCap: parseNullableNumber(stats.market_capitalization ?? stats.marketCap),
      peRatio: parseNullableNumber(stats.pe_ratio ?? stats.peRatio),
      eps: parseNullableNumber(stats.eps),
      revenue: parseNullableNumber(stats.revenue),
      sector: typeof stats.sector === "string" ? stats.sector : null,
    } satisfies Fundamentals;
  });

  if (tdResult) {
    cacheSet(cacheKey, tdResult, FUNDAMENTALS_TTL);
    return tdResult;
  }

  // Fallback: Yahoo Finance
  const yfResult = await tryYahooFinance(async () => {
    const data = await yahooFinance.quoteSummary(normalized, {
      modules: ["summaryDetail", "summaryProfile", "defaultKeyStatistics"],
    });
    const detail = data.summaryDetail ?? {};
    const profile = data.summaryProfile ?? {};
    const keyStats = data.defaultKeyStatistics ?? {};
    return {
      symbol: normalized,
      marketCap: keyStats.marketCap ?? null,
      peRatio: detail.trailingPE ?? null,
      eps: detail.trailingEps ?? null,
      revenue: (keyStats as Record<string, unknown>).totalRevenue
        ? Number((keyStats as Record<string, unknown>).totalRevenue)
        : null,
      sector: profile.sector ?? null,
    } satisfies Fundamentals;
  });

  if (yfResult) {
    cacheSet(cacheKey, yfResult, FUNDAMENTALS_TTL);
    return yfResult;
  }

  throw new StockDataError(
    `Failed to fetch fundamentals for ${normalized} — both APIs unavailable`,
    "ALL_DOWN",
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rangeToOutputSize(range: string): number {
  switch (range) {
    case "1mo":
      return 30;
    case "3mo":
      return 90;
    case "6mo":
      return 180;
    case "1y":
      return 365;
    default:
      return 30;
  }
}

function rangeToDate(range: string): Date {
  const now = new Date();
  switch (range) {
    case "1mo":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "3mo":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "6mo":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "1y":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
}

function intervalToYfInterval(
  interval: "1d" | "1wk" | "1mo",
): "1d" | "1wk" | "1mo" {
  return interval; // yahoo-finance2 uses the same interval strings
}

function parseNullableNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Compute Simple Moving Average from an array of closes.
 */
function computeSMA(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += closes[j];
      }
      result.push(sum / period);
    }
  }
  return result;
}
