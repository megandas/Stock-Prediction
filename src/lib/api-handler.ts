/**
 * API route handler — mounted at /api/* in both dev (Vite plugin) and production (serve.ts).
 * This bypasses TanStack Router since this version doesn't support createAPIFileRoute.
 */
import { getQuote, StockDataError } from "./stock-data";
import { getActiveSignals, generateSignals, getSignalHistory } from "./signal-engine";

export async function handleApiRequest(req: Request): Promise<Response | null> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (!pathname.startsWith("/api/")) return null;

  // GET /api/quote?symbol=AAPL
  if (pathname === "/api/quote" && req.method === "GET") {
    return handleQuoteApi(url);
  }

  // GET /api/signals?symbol=AAPL (optional symbol filter)
  // GET /api/signals?refresh=true (force regeneration)
  if (pathname === "/api/signals" && req.method === "GET") {
    return handleSignalsApi(url);
  }

  // 404 for unknown API routes
  return new Response(
    JSON.stringify({ error: "Unknown API endpoint", path: pathname }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function handleQuoteApi(url: URL): Promise<Response> {
  const symbol = url.searchParams.get("symbol");

  if (!symbol || symbol.trim().length === 0) {
    return new Response(
      JSON.stringify({
        error: "Missing required query parameter: symbol",
        example: "/api/quote?symbol=AAPL",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const quote = await getQuote(symbol.trim());
    return new Response(JSON.stringify(quote), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=30, s-maxage=60",
      },
    });
  } catch (err) {
    if (err instanceof StockDataError) {
      return new Response(
        JSON.stringify({
          error: err.message,
          code: err.code,
          symbol: symbol.trim().toUpperCase(),
        }),
        {
          status: statusFromCode(err.code),
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        symbol: symbol.trim().toUpperCase(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function handleSignalsApi(url: URL): Promise<Response> {
  const symbolFilter = url.searchParams.get("symbol")?.trim().toUpperCase() ?? null;
  const refresh = url.searchParams.get("refresh") === "true";

  try {
    if (refresh) {
      // Force regeneration: if symbol filter provided, only scan that symbol
      const watchlist = symbolFilter ? [symbolFilter] : undefined;
      await generateSignals(watchlist);
    }

    let signals = getActiveSignals();

    // Filter by symbol if requested
    if (symbolFilter) {
      signals = signals.filter((s) => s.symbol === symbolFilter);
    }

    return new Response(JSON.stringify({ signals, count: signals.length }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (err) {
    console.error("[api-handler] /api/signals error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch signals", signals: [], count: 0 }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

function statusFromCode(code: StockDataError["code"]): number {
  switch (code) {
    case "API_KEY_MISSING":
      return 503;
    case "RATE_LIMITED":
      return 429;
    case "NOT_FOUND":
      return 404;
    case "API_ERROR":
      return 502;
    case "ALL_DOWN":
      return 503;
    default:
      return 500;
  }
}
