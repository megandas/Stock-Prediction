import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface SignalIndicators {
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

interface Signal {
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

interface SignalHistoryRow {
  date: string;
  symbol: string;
  action: string;
  entry: number;
  target: number;
  stopLoss: number;
  status: "HIT TARGET" | "STOPPED OUT" | "EXPIRED";
  returnPct: string;
}

/* ------------------------------------------------------------------ */
/*  Route                                                             */
/* ------------------------------------------------------------------ */

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [{ title: "Dashboard — SignalEdge" }],
  }),
});

/* ------------------------------------------------------------------ */
/*  Navbar                                                            */
/* ------------------------------------------------------------------ */

function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-slate-950">
            S
          </span>
          <span className="text-xl font-semibold tracking-tight text-white">
            SignalEdge
          </span>
        </a>

        {/* Nav links */}
        <div className="flex items-center gap-6">
          <a
            href="/dashboard"
            className="text-sm font-medium text-emerald-400"
          >
            Dashboard
          </a>
          <a
            href="#"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Settings
          </a>
          {/* User avatar placeholder */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-gray-300">
            U
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Track Record Stats                                                */
/* ------------------------------------------------------------------ */

function StatsBar() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard label="Win Rate" value="68%" sub="Rolling 90-day" />
      <StatCard label="Avg Return" value="+3.2%" sub="Per signal" />
      <StatCard label="Active Subscribers" value="—" sub="Join the waitlist" />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-center sm:p-6">
      <div className="text-2xl font-bold text-emerald-400 sm:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{label}</div>
      <div className="mt-0.5 text-xs text-gray-500">{sub}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Risk Badge                                                        */
/* ------------------------------------------------------------------ */

function RiskBadge({ rating }: { rating: Signal["riskRating"] }) {
  const colors: Record<Signal["riskRating"], string> = {
    LOW: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    MEDIUM: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    HIGH: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[rating]}`}
    >
      {rating}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Confidence Bar                                                    */
/* ------------------------------------------------------------------ */

function ConfidenceBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-400">{pct}%</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Indicator Icons                                                   */
/* ------------------------------------------------------------------ */

function IndicatorIcons({ indicators }: { indicators: SignalIndicators }) {
  const items = [
    {
      label: "RSI",
      value: indicators.rsi,
      ok: indicators.rsi != null && indicators.rsi >= 30 && indicators.rsi <= 45,
      detail: indicators.rsi != null ? indicators.rsi.toFixed(1) : "—",
    },
    {
      label: "MACD",
      value: indicators.macd.crossedAbove,
      ok: indicators.macd.crossedAbove,
      detail: indicators.macd.crossedAbove ? "Crossed ↑" : "No cross",
    },
    {
      label: "SMA",
      value: indicators.sma50 != null && indicators.sma200 != null,
      ok:
        indicators.sma50 != null &&
        indicators.sma200 != null &&
        indicators.sma50 > indicators.sma200,
      detail:
        indicators.sma50 != null && indicators.sma200 != null
          ? `50>200: ${indicators.sma50 > indicators.sma200 ? "✓" : "✗"}`
          : "—",
    },
    {
      label: "VOL",
      value: indicators.volumeRatio,
      ok: indicators.volumeRatio != null && indicators.volumeRatio >= 1.0,
      detail:
        indicators.volumeRatio != null
          ? `${indicators.volumeRatio.toFixed(1)}x`
          : "—",
    },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
            item.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-slate-700 bg-slate-800/50 text-gray-500"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              item.ok ? "bg-emerald-400" : "bg-gray-600"
            }`}
          />
          <span className="font-medium">{item.label}</span>
          <span className="opacity-70">{item.detail}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expires Countdown                                                 */
/* ------------------------------------------------------------------ */

function ExpiresCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const expires = new Date(expiresAt).getTime();
  const remaining = expires - now;

  if (remaining <= 0) {
    return (
      <span className="text-xs text-red-400 font-medium">Expired</span>
    );
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <span className="text-xs text-gray-500">
      Expires in{" "}
      <span className="text-gray-400 font-medium">
        {hours}h {minutes}m
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal Card                                                       */
/* ------------------------------------------------------------------ */

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-emerald-500/20 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-white sm:text-2xl">
              {signal.symbol}
            </span>
            <RiskBadge rating={signal.riskRating} />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {signal.action} signal
          </p>
        </div>
        <ConfidenceBar pct={signal.confidence} />
      </div>

      {/* Price Levels */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-slate-800/50 p-3 text-center">
          <div className="text-xs text-gray-500">Entry</div>
          <div className="mt-0.5 text-sm font-semibold text-white">
            ${signal.entryPrice.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
          <div className="text-xs text-gray-500">Target</div>
          <div className="mt-0.5 text-sm font-semibold text-emerald-400">
            ${signal.targetPrice.toFixed(2)}
          </div>
        </div>
        <div className="rounded-lg bg-red-500/10 p-3 text-center">
          <div className="text-xs text-gray-500">Stop Loss</div>
          <div className="mt-0.5 text-sm font-semibold text-red-400">
            ${signal.stopLoss.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="mt-4">
        <IndicatorIcons indicators={signal.indicators} />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
        <span className="text-xs text-gray-600">
          Generated{" "}
          {new Date(signal.generatedAt).toLocaleString()}
        </span>
        <ExpiresCountdown expiresAt={signal.expiresAt} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Signals Panel                                              */
/* ------------------------------------------------------------------ */

function ActiveSignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch("/api/signals");
      if (!res.ok) throw new Error("API returned " + res.status);
      const data = await res.json();
      setSignals(data.signals ?? []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSignals();
    const interval = setInterval(fetchSignals, 60_000);
    return () => clearInterval(interval);
  }, [fetchSignals]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Active Signals
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 p-6"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="h-6 w-20 rounded bg-slate-700" />
                  <div className="mt-2 h-3 w-12 rounded bg-slate-700" />
                </div>
                <div className="h-8 w-16 rounded bg-slate-700" />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-14 rounded-lg bg-slate-800/50" />
                <div className="h-14 rounded-lg bg-slate-800/50" />
                <div className="h-14 rounded-lg bg-slate-800/50" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-14 rounded bg-slate-700" />
                <div className="h-6 w-14 rounded bg-slate-700" />
                <div className="h-6 w-14 rounded bg-slate-700" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Active Signals
        </h2>
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <svg
            className="mx-auto h-10 w-10 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="mt-3 text-sm font-medium text-red-400">
            Could not load signals
          </p>
          <p className="mt-1 text-xs text-gray-500">{error}</p>
          <button
            onClick={fetchSignals}
            className="mt-4 rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-slate-800"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  /* ---- Empty ---- */
  if (signals.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Active Signals
        </h2>
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-10 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5"
            />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No Active Signals
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-500">
            Market conditions haven&apos;t aligned to trigger any signals yet.
            Signals appear here automatically when our models detect
            opportunities.
          </p>
          <a
            href="#history"
            className="mt-6 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            View Track Record
          </a>
        </div>
      </section>
    );
  }

  /* ---- Signals ---- */
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Active Signals
        </h2>
        <span className="text-xs text-gray-500">
          {signals.length} signal{signals.length !== 1 ? "s" : ""} &middot; auto-refreshes
        </span>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {signals.map((s) => (
          <SignalCard key={s.symbol} signal={s} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Signal History                                                    */
/* ------------------------------------------------------------------ */

const PLACEHOLDER_HISTORY: SignalHistoryRow[] = [
  {
    date: "2026-07-17",
    symbol: "NVDA",
    action: "BUY",
    entry: 142.3,
    target: 149.42,
    stopLoss: 138.03,
    status: "HIT TARGET",
    returnPct: "+6.1%",
  },
  {
    date: "2026-07-15",
    symbol: "TSLA",
    action: "BUY",
    entry: 248.75,
    target: 261.19,
    stopLoss: 241.29,
    status: "EXPIRED",
    returnPct: "+1.3%",
  },
  {
    date: "2026-07-12",
    symbol: "GOOGL",
    action: "BUY",
    entry: 185.5,
    target: 194.78,
    stopLoss: 179.94,
    status: "HIT TARGET",
    returnPct: "+5.8%",
  },
  {
    date: "2026-07-10",
    symbol: "AAPL",
    action: "BUY",
    entry: 227.8,
    target: 239.19,
    stopLoss: 220.97,
    status: "STOPPED OUT",
    returnPct: "-2.1%",
  },
  {
    date: "2026-07-08",
    symbol: "MSFT",
    action: "BUY",
    entry: 468.2,
    target: 491.61,
    stopLoss: 454.15,
    status: "HIT TARGET",
    returnPct: "+4.2%",
  },
];

function SignalHistory() {
  const statusColors: Record<SignalHistoryRow["status"], string> = {
    "HIT TARGET":
      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    "STOPPED OUT": "bg-red-500/15 text-red-400 border-red-500/30",
    EXPIRED: "bg-slate-700/50 text-gray-400 border-slate-600/30",
  };

  return (
    <section id="history" className="mt-10">
      <h2 className="text-lg font-semibold text-white sm:text-xl">
        Signal History
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Recent closed signals. Past performance does not guarantee future
        results.
      </p>

      {/* Mobile: card layout */}
      <div className="mt-4 space-y-3 sm:hidden">
        {PLACEHOLDER_HISTORY.map((row) => (
          <div
            key={`${row.symbol}-${row.date}`}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{row.symbol}</span>
              <span
                className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColors[row.status]}`}
              >
                {row.status}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400">
              <span>Entry: ${row.entry.toFixed(2)}</span>
              <span>Target: ${row.target.toFixed(2)}</span>
              <span>Stop: ${row.stopLoss.toFixed(2)}</span>
              <span className="text-right">
                <span
                  className={
                    row.returnPct.startsWith("+")
                      ? "text-emerald-400"
                      : "text-red-400"
                  }
                >
                  {row.returnPct}
                </span>
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-600">{row.date}</div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-800 sm:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/70">
              <th className="px-4 py-3 font-medium text-gray-400">Date</th>
              <th className="px-4 py-3 font-medium text-gray-400">Symbol</th>
              <th className="px-4 py-3 font-medium text-gray-400">Action</th>
              <th className="px-4 py-3 font-medium text-gray-400">Entry</th>
              <th className="px-4 py-3 font-medium text-gray-400">Target</th>
              <th className="px-4 py-3 font-medium text-gray-400">
                Stop Loss
              </th>
              <th className="px-4 py-3 font-medium text-gray-400">Status</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">
                Return
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {PLACEHOLDER_HISTORY.map((row) => (
              <tr
                key={`${row.symbol}-${row.date}`}
                className="transition-colors hover:bg-slate-800/30"
              >
                <td className="px-4 py-3 text-gray-500">{row.date}</td>
                <td className="px-4 py-3 font-medium text-white">
                  {row.symbol}
                </td>
                <td className="px-4 py-3 text-emerald-400">{row.action}</td>
                <td className="px-4 py-3 text-gray-300">
                  ${row.entry.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-emerald-400">
                  ${row.target.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-red-400">
                  ${row.stopLoss.toFixed(2)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${statusColors[row.status]}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium ${
                    row.returnPct.startsWith("+")
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {row.returnPct}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-600">
        Placeholder data for demonstration. Live history coming soon.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-xs font-bold text-slate-950">
              S
            </span>
            <span className="text-sm font-semibold text-white">
              SignalEdge
            </span>
          </div>
          <p className="text-xs text-gray-600">
            &copy; {new Date().getFullYear()} SignalEdge
          </p>
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-gray-600">
          SignalEdge provides stock analysis and trade ideas for educational
          purposes. Past performance does not guarantee future results. All
          trading involves risk. We do not guarantee profits. The information
          provided is not financial advice and you should consult with a
          qualified financial professional before making investment decisions.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard — compose                                                */
/* ------------------------------------------------------------------ */

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your active signals and performance overview
          </p>
        </div>

        {/* Stats */}
        <StatsBar />

        {/* Active Signals */}
        <div className="mt-10">
          <ActiveSignals />
        </div>

        {/* Signal History */}
        <SignalHistory />
      </main>
      <Footer />
    </div>
  );
}
