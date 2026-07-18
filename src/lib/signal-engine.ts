/**
 * SignalEdge — Signal Engine (v1 MVP)
 *
 * Multi-Indicator Confluence strategy:
 *   BUY signal when ≥ 3 of 4 conditions are met:
 *   1. RSI (14): between 30–45
 *   2. MACD: MACD line crossed above signal line within last 3 days
 *   3. SMA 50 > SMA 200 (uptrend)
 *   4. Current volume > 20-day average volume
 *
 * All data fetching is server-side via stock-data.ts.
 * Falls back to manual computation of indicators from historical data
 * when Twelve Data is unavailable.
 */

import {
  getQuote,
  getHistorical,
  getIndicator,
  type OHLCV,
} from "./stock-data";
import { DEFAULT_WATCHLIST } from "./watchlist";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SignalIndicators {
  rsi: number | null;
  macd: {
    macdLine: number | null;
    signalLine: number | null;
    histogram: number | null;
    crossedAbove: boolean;
  };
  sma50: number | null;
  sma200: number | null;
  volumeRatio: number | null;
}

export interface Signal {
  symbol: string;
  action: "BUY" | "SELL";
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRating: "LOW" | "MEDIUM" | "HIGH";
  confidence: number;
  indicators: SignalIndicators;
  generatedAt: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// In-Memory Signal Store
// ---------------------------------------------------------------------------

const signalStore = new Map<string, Signal>();
const signalHistory = new Map<string, Signal[]>();

function storeSignal(signal: Signal): void {
  const { symbol } = signal;
  // Archive existing signal for history
  const existing = signalStore.get(symbol);
  if (existing) {
    const history = signalHistory.get(symbol) ?? [];
    history.push(existing);
    // Keep last 50 signals per symbol
    if (history.length > 50) history.shift();
    signalHistory.set(symbol, history);
  }
  signalStore.set(symbol, signal);
}

/** Purge expired signals from the store. */
function purgeExpired(): void {
  const now = new Date().toISOString();
  for (const [symbol, signal] of signalStore.entries()) {
    if (signal.expiresAt <= now) {
      signalStore.delete(symbol);
    }
  }
}

/** Get all currently active (non-expired) signals. */
export function getActiveSignals(): Signal[] {
  purgeExpired();
  return Array.from(signalStore.values());
}

/** Get signal history for a symbol. */
export function getSignalHistory(symbol: string): Signal[] {
  const history = signalHistory.get(symbol.toUpperCase()) ?? [];
  // Also include the current active signal if present
  const current = signalStore.get(symbol.toUpperCase());
  if (current) {
    return [...history, current];
  }
  return [...history];
}

// ---------------------------------------------------------------------------
// Indicator Computation Fallbacks (from historical OHLCV data)
// ---------------------------------------------------------------------------

/**
 * Compute Relative Strength Index (RSI) using Wilder's smoothing.
 * Returns the most recent RSI value (null if not enough data).
 */
function computeRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) return null;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // Initial average over first `period` changes
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Compute Exponential Moving Average.
 */
function computeEMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  if (values.length === 0) return result;

  const multiplier = 2 / (period + 1);

  // First EMA is the SMA of the first `period` values
  let ema: number | null = null;
  if (values.length >= period) {
    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    ema = sum / period;
  }

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      result.push(ema);
    } else {
      ema = (values[i] - ema!) * multiplier + ema!;
      result.push(ema);
    }
  }
  return result;
}

/**
 * Compute MACD from closing prices.
 * Returns the MACD line, signal line, and histogram arrays.
 */
function computeMACD(
  closes: number[],
  fast: number = 12,
  slow: number = 26,
  signalPeriod: number = 9,
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const emaFast = computeEMA(closes, fast);
  const emaSlow = computeEMA(closes, slow);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (emaFast[i] != null && emaSlow[i] != null) {
      macdLine.push(emaFast[i]! - emaSlow[i]!);
    } else {
      macdLine.push(null);
    }
  }

  // Find first non-null macdLine index
  let startIdx = 0;
  while (startIdx < macdLine.length && macdLine[startIdx] == null) startIdx++;

  const signalLine: (number | null)[] = [];
  const histogram: (number | null)[] = [];

  if (startIdx >= macdLine.length) {
    // No valid MACD data
    for (let i = 0; i < closes.length; i++) {
      signalLine.push(null);
      histogram.push(null);
    }
    return { macdLine, signalLine, histogram };
  }

  const validMacd: number[] = macdLine.slice(startIdx) as number[];
  const emaSignal = computeEMA(validMacd, signalPeriod);

  // Pad with nulls up to startIdx
  for (let i = 0; i < startIdx; i++) {
    signalLine.push(null);
    histogram.push(null);
  }

  for (let i = 0; i < emaSignal.length; i++) {
    signalLine.push(emaSignal[i]);
    if (emaSignal[i] != null && macdLine[startIdx + i] != null) {
      histogram.push(macdLine[startIdx + i]! - emaSignal[i]!);
    } else {
      histogram.push(null);
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Check if MACD line crossed above the signal line within the last `lookback` days.
 */
function checkMACDCrossover(
  macdLine: (number | null)[],
  signalLine: (number | null)[],
  lookback: number = 3,
): boolean {
  // Get the last `lookback + 1` valid entries to detect crossover
  const validIndices: number[] = [];
  for (let i = macdLine.length - 1; i >= 0 && validIndices.length < lookback + 2; i--) {
    if (macdLine[i] != null && signalLine[i] != null) {
      validIndices.unshift(i);
    }
  }

  if (validIndices.length < 2) return false;

  // Check if any pair in the lookback window shows a crossover
  for (let j = 0; j < validIndices.length - 1; j++) {
    const prevIdx = validIndices[j];
    const currIdx = validIndices[j + 1];
    const prevDiff = macdLine[prevIdx]! - signalLine[prevIdx]!;
    const currDiff = macdLine[currIdx]! - signalLine[currIdx]!;

    // Crossed above: was at or below signal, now above
    if (prevDiff <= 0 && currDiff > 0) return true;
  }

  return false;
}

/**
 * Compute Simple Moving Average.
 */
function computeSMAFromArray(values: number[], period: number): number | null {
  if (values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) {
    sum += values[i];
  }
  return sum / period;
}

// ---------------------------------------------------------------------------
// Signal Generation
// ---------------------------------------------------------------------------

/** Delay helper for sequential scanning. */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate buy signals for a watchlist of symbols.
 * Scans sequentially with 250ms delays to stay well within rate limits.
 * If a symbol fails, it's skipped gracefully.
 *
 * @param watchlist Array of stock symbols to scan (defaults to DEFAULT_WATCHLIST)
 * @returns Array of active signals
 */
export async function generateSignals(
  watchlist?: string[],
): Promise<Signal[]> {
  const symbols = watchlist ?? DEFAULT_WATCHLIST;
  const signals: Signal[] = [];

  console.log(
    `[signal-engine] Starting signal scan for ${symbols.length} symbols...`,
  );

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i].toUpperCase();

    try {
      const signal = await evaluateSymbol(symbol);
      if (signal) {
        storeSignal(signal);
        signals.push(signal);
        console.log(
          `[signal-engine] ✅ SIGNAL: ${symbol} | Confidence: ${signal.confidence}% | Risk: ${signal.riskRating} | ` +
            `Entry: $${signal.entryPrice.toFixed(2)} | Target: $${signal.targetPrice.toFixed(2)} | Stop: $${signal.stopLoss.toFixed(2)}`,
        );
      } else {
        console.log(`[signal-engine] — ${symbol}: no signal (conditions not met)`);
      }
    } catch (err) {
      console.warn(
        `[signal-engine] ⚠️ ${symbol}: skipped — ${(err as Error).message}`,
      );
    }

    // Sequential delay to be gentle on APIs
    if (i < symbols.length - 1) {
      await delay(250);
    }
  }

  console.log(
    `[signal-engine] Scan complete. ${signals.length} signal(s) generated from ${symbols.length} symbol(s).`,
  );

  return signals;
}

/**
 * Evaluate a single symbol against the multi-indicator confluence strategy.
 * Returns a Signal if ≥ 3 of 4 conditions are met, otherwise null.
 */
async function evaluateSymbol(symbol: string): Promise<Signal | null> {
  const conditionsMet: string[] = [];
  const indicators: SignalIndicators = {
    rsi: null,
    macd: { macdLine: null, signalLine: null, histogram: null, crossedAbove: false },
    sma50: null,
    sma200: null,
    volumeRatio: null,
  };

  // Fetch quote (needed for entry price + volume check)
  let quote;
  try {
    quote = await getQuote(symbol);
  } catch {
    // Quote is required — cannot proceed without it
    console.warn(`[signal-engine] ${symbol}: failed to fetch quote — skipping`);
    return null;
  }

  const entryPrice = quote.price;
  if (entryPrice <= 0) {
    console.warn(`[signal-engine] ${symbol}: invalid price (${entryPrice}) — skipping`);
    return null;
  }

  // Fetch historical data for manual indicator computation + SMA + volume
  let historical: OHLCV[] = [];
  try {
    // Need at least 200 days for SMA 200 + buffer
    historical = await getHistorical(symbol, "1d", "1y");
  } catch {
    console.warn(`[signal-engine] ${symbol}: failed to fetch historical data`);
  }

  const closes = historical.map((h) => h.close);
  const volumes = historical.map((h) => h.volume);

  // -----------------------------------------------------------------------
  // Condition 1: RSI between 30-45
  // -----------------------------------------------------------------------
  let rsiValue: number | null = null;

  // Try Twelve Data indicator first
  try {
    const rsiResult = await getIndicator(symbol, "rsi", { period: 14 });
    if (rsiResult.values.length > 0) {
      // Twelve Data RSI values have "rsi" key
      rsiValue = rsiResult.values[0].rsi;
    }
  } catch {
    // Fallback: compute from historical data
  }

  if (rsiValue == null && closes.length >= 15) {
    rsiValue = computeRSI(closes, 14);
  }

  indicators.rsi = rsiValue != null ? Math.round(rsiValue * 100) / 100 : null;

  if (indicators.rsi != null && indicators.rsi >= 30 && indicators.rsi <= 45) {
    conditionsMet.push("RSI");
    console.log(`[signal-engine] ${symbol}: ✓ RSI=${indicators.rsi.toFixed(1)} (target: 30-45)`);
  } else if (indicators.rsi != null) {
    console.log(`[signal-engine] ${symbol}: ✗ RSI=${indicators.rsi.toFixed(1)} (target: 30-45)`);
  } else {
    console.log(`[signal-engine] ${symbol}: ? RSI unavailable`);
  }

  // -----------------------------------------------------------------------
  // Condition 2: MACD crossover within last 3 days
  // -----------------------------------------------------------------------
  let macdCrossedAbove = false;
  let macdLineVal: number | null = null;
  let signalLineVal: number | null = null;
  let histogramVal: number | null = null;

  try {
    const macdResult = await getIndicator(symbol, "macd", {});
    if (macdResult.values.length > 0) {
      // Twelve Data MACD returns: macd, signal, hist keys
      macdLineVal = macdResult.values[0].macd ?? null;
      signalLineVal = macdResult.values[0].signal ?? null;
      histogramVal = macdResult.values[0].hist ?? null;

      // Check crossover from previous values
      if (macdResult.values.length >= 2 && macdLineVal != null && signalLineVal != null) {
        const prevMacd = macdResult.values[1].macd ?? null;
        const prevSignal = macdResult.values[1].signal ?? null;
        if (prevMacd != null && prevSignal != null) {
          macdCrossedAbove = prevMacd <= prevSignal && macdLineVal > signalLineVal;
        }
      }
    }
  } catch {
    // Fallback: compute MACD from historical
  }

  if (macdLineVal == null && closes.length >= 30) {
    const { macdLine, signalLine, histogram } = computeMACD(closes);
    // Get latest values
    for (let i = macdLine.length - 1; i >= 0; i--) {
      if (macdLine[i] != null) {
        macdLineVal = Math.round(macdLine[i]! * 10000) / 10000;
        signalLineVal = signalLine[i] != null ? Math.round(signalLine[i]! * 10000) / 10000 : null;
        histogramVal = histogram[i] != null ? Math.round(histogram[i]! * 10000) / 10000 : null;
        break;
      }
    }
    macdCrossedAbove = checkMACDCrossover(macdLine, signalLine, 3);
  }

  indicators.macd = {
    macdLine: macdLineVal,
    signalLine: signalLineVal,
    histogram: histogramVal,
    crossedAbove: macdCrossedAbove,
  };

  if (macdCrossedAbove) {
    conditionsMet.push("MACD");
  }
  console.log(
    `[signal-engine] ${symbol}: ${macdCrossedAbove ? "✓" : "✗"} MACD crossover | ` +
      `MACD=${macdLineVal != null ? macdLineVal.toFixed(4) : "N/A"} ` +
      `Signal=${signalLineVal != null ? signalLineVal.toFixed(4) : "N/A"} ` +
      `Crossed=${macdCrossedAbove}`,
  );

  // -----------------------------------------------------------------------
  // Condition 3: SMA 50 > SMA 200 (uptrend)
  // -----------------------------------------------------------------------
  let sma50: number | null = null;
  let sma200: number | null = null;

  // Try Twelve Data
  try {
    const sma50Result = await getIndicator(symbol, "sma", { period: 50 });
    if (sma50Result.values.length > 0) {
      sma50 = sma50Result.values[0].sma;
    }
  } catch { /* fallback */ }

  try {
    const sma200Result = await getIndicator(symbol, "sma", { period: 200 });
    if (sma200Result.values.length > 0) {
      sma200 = sma200Result.values[0].sma;
    }
  } catch { /* fallback */ }

  // Fallback: compute from historical
  if (sma50 == null && closes.length >= 50) {
    sma50 = computeSMAFromArray(closes, 50);
  }
  if (sma200 == null && closes.length >= 200) {
    sma200 = computeSMAFromArray(closes, 200);
  }

  indicators.sma50 = sma50 != null ? Math.round(sma50 * 100) / 100 : null;
  indicators.sma200 = sma200 != null ? Math.round(sma200 * 100) / 100 : null;

  const smaUptrend = indicators.sma50 != null && indicators.sma200 != null && indicators.sma50 > indicators.sma200;

  if (smaUptrend) {
    conditionsMet.push("SMA");
  }
  console.log(
    `[signal-engine] ${symbol}: ${smaUptrend ? "✓" : "✗"} SMA 50/200 | ` +
      `SMA50=${indicators.sma50 != null ? indicators.sma50.toFixed(2) : "N/A"} ` +
      `SMA200=${indicators.sma200 != null ? indicators.sma200.toFixed(2) : "N/A"}`,
  );

  // -----------------------------------------------------------------------
  // Condition 4: Volume > 20-day average volume
  // -----------------------------------------------------------------------
  let volumeRatio: number | null = null;

  if (volumes.length >= 20) {
    const avgVolume20 = computeSMAFromArray(volumes.slice(0, -1), 20); // exclude today from avg
    if (avgVolume20 != null && avgVolume20 > 0) {
      volumeRatio = quote.volume / avgVolume20;
    }
  }

  indicators.volumeRatio = volumeRatio != null ? Math.round(volumeRatio * 100) / 100 : null;

  const volumeConfirmed = indicators.volumeRatio != null && indicators.volumeRatio >= 1.0;

  if (volumeConfirmed) {
    conditionsMet.push("VOLUME");
  }
  console.log(
    `[signal-engine] ${symbol}: ${volumeConfirmed ? "✓" : "✗"} VOLUME | ` +
      `Ratio=${indicators.volumeRatio != null ? indicators.volumeRatio.toFixed(2) : "N/A"} (need ≥ 1.0)`,
  );

  // -----------------------------------------------------------------------
  // Decision: ≥ 3 of 4 conditions met → BUY signal
  // -----------------------------------------------------------------------
  const metCount = conditionsMet.length;
  console.log(
    `[signal-engine] ${symbol}: ${metCount}/4 conditions met [${conditionsMet.join(", ") || "none"}]`,
  );

  if (metCount < 3) return null;

  // -----------------------------------------------------------------------
  // Build signal
  // -----------------------------------------------------------------------
  const generatedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const targetPrice = Math.round(entryPrice * 1.05 * 100) / 100;
  const stopLoss = Math.round(entryPrice * 0.97 * 100) / 100;

  // Confidence: 0-100 based on condition strength
  let confidence = metCount * 25; // base: 75-100
  // Bonus for strong RSI (closer to 30 = more oversold = higher confidence)
  if (indicators.rsi != null && indicators.rsi <= 35) confidence += 10;
  if (indicators.rsi != null && indicators.rsi <= 32) confidence += 5;
  // Bonus for strong volume confirmation
  if (indicators.volumeRatio != null && indicators.volumeRatio >= 1.5) confidence += 5;
  confidence = Math.min(confidence, 100);

  // Risk rating
  let riskRating: "LOW" | "MEDIUM" | "HIGH";
  if (metCount === 4 && confidence >= 90) {
    riskRating = "LOW";
  } else if (metCount === 4 || confidence >= 80) {
    riskRating = "MEDIUM";
  } else {
    riskRating = "HIGH";
  }

  return {
    symbol,
    action: "BUY",
    entryPrice: Math.round(entryPrice * 100) / 100,
    targetPrice,
    stopLoss,
    riskRating,
    confidence,
    indicators,
    generatedAt,
    expiresAt,
  };
}
