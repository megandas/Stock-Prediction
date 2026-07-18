import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

/* ------------------------------------------------------------------ */
/*  Navbar                                                            */
/* ------------------------------------------------------------------ */
function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <a href="#" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-slate-950">
            S
          </span>
          <span className="text-xl font-semibold tracking-tight text-white">
            SignalEdge
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            Pricing
          </a>
          <a
            href="#faq"
            className="text-sm text-gray-400 transition-colors hover:text-white"
          >
            FAQ
          </a>
          <a
            href="#pricing"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className={`block h-0.5 w-5 rounded bg-gray-300 transition-transform ${
              menuOpen ? "translate-y-[5px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded bg-gray-300 transition-opacity ${
              menuOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-5 rounded bg-gray-300 transition-transform ${
              menuOpen ? "-translate-y-[5px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-800 bg-slate-950 px-4 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-4">
            <a
              href="#features"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Pricing
            </a>
            <a
              href="#faq"
              onClick={() => setMenuOpen(false)}
              className="text-sm text-gray-400 hover:text-white"
            >
              FAQ
            </a>
            <a
              href="#pricing"
              onClick={() => setMenuOpen(false)}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero                                                              */
/* ------------------------------------------------------------------ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Data-viz background motif */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
        <svg
          viewBox="0 0 1200 600"
          className="h-full w-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * 60}
              x2={1200}
              y2={i * 60}
              stroke="#10b981"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 21 }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * 60}
              y1={0}
              x2={i * 60}
              y2={600}
              stroke="#10b981"
              strokeWidth="1"
            />
          ))}
          {/* Candle-style chart line */}
          <polyline
            points="0,400 60,380 120,420 180,340 240,360 300,280 360,320 420,260 480,290 540,200 600,230 660,170 720,190 780,130 840,160 900,100 960,120 1020,80 1080,110 1140,70 1200,90"
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
          />
          {/* Area fill */}
          <polygon
            points="0,400 60,380 120,420 180,340 240,360 300,280 360,320 420,260 480,290 540,200 600,230 660,170 720,190 780,130 840,160 900,100 960,120 1020,80 1080,110 1140,70 1200,90 1200,600 0,600"
            fill="#10b981"
            opacity="0.3"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Trade Smarter with{" "}
            <span className="text-emerald-400">Data-Driven Signals</span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-gray-400 sm:text-xl">
            Algorithmic buy/sell signals with entry timing, exit targets, and
            risk ratings — delivered to help you make informed decisions. No
            hype. No guarantees. Just rigorous analysis.
          </p>
          <div className="mt-10">
            <a
              href="#pricing"
              className="inline-block rounded-xl bg-emerald-500 px-8 py-4 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-500/40"
            >
              View Plans
            </a>
          </div>

          {/* Trust bar */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Rolling 90-day track record
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              No lock-in contracts
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Cancel anytime
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works                                                      */
/* ------------------------------------------------------------------ */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Our models analyze",
      desc: "We scan thousands of stocks daily using technical and fundamental algorithms, identifying setups with favorable risk/reward profiles.",
      icon: (
        <svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605"
          />
        </svg>
      ),
    },
    {
      num: "02",
      title: "Signals are generated",
      desc: "Each trade idea includes a precise entry price, profit target, stop-loss level, and a clear risk rating — so you know exactly what you're working with.",
      icon: (
        <svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
          />
        </svg>
      ),
    },
    {
      num: "03",
      title: "You decide",
      desc: "Review the signals on your dashboard, evaluate the analysis, and execute trades through your own brokerage — you stay in full control.",
      icon: (
        <svg
          className="h-8 w-8 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      ),
    },
  ];

  return (
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Three simple steps from market data to actionable trade ideas.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-8 transition-colors hover:border-emerald-500/30 hover:bg-slate-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
                  {step.icon}
                </div>
                <span className="text-2xl font-bold text-slate-700 group-hover:text-emerald-500/30 transition-colors">
                  {step.num}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Pricing                                                           */
/* ------------------------------------------------------------------ */
function Pricing() {
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Starter",
      monthly: 29,
      annually: 279,
      signals: "5 signals/month",
      features: [
        "Daily market briefing",
        "Email delivery",
        "Standard risk ratings",
        "Monthly performance report",
      ],
      highlighted: false,
    },
    {
      name: "Pro",
      monthly: 59,
      annually: 567,
      signals: "20 signals/month",
      features: [
        "Real-time alerts",
        "Advanced risk analytics",
        "Performance dashboard",
        "SMS & push notifications",
        "Priority support",
      ],
      highlighted: true,
    },
    {
      name: "Max",
      monthly: 99,
      annually: 950,
      signals: "Unlimited signals",
      features: [
        "Portfolio tracking",
        "Monthly strategy call",
        "Custom alert thresholds",
        "Early access to new features",
        "Dedicated account manager",
      ],
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            Choose the plan that fits your trading style. No hidden fees.
          </p>

          {/* Annual toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!annual ? "text-white" : "text-gray-500"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                annual ? "bg-emerald-500" : "bg-slate-700"
              }`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  annual ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm ${annual ? "text-white" : "text-gray-500"}`}
            >
              Annual{" "}
              <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-semibold text-slate-950">
                  Most Popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-white">
                  ${annual ? plan.annually : plan.monthly}
                </span>
                <span className="text-sm text-gray-400">
                  /{annual ? "yr" : "mo"}
                </span>
              </div>
              {annual && (
                <p className="mt-1 text-xs text-emerald-400">
                  Save 20% with annual billing
                </p>
              )}
              <p className="mt-2 text-sm font-medium text-emerald-400">
                {plan.signals}
              </p>

              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-start gap-2 text-sm text-gray-400"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>

              <a
                href="/dashboard"
                className={`mt-8 block rounded-xl px-6 py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlighted
                    ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 hover:bg-emerald-400"
                    : "border border-slate-700 text-white hover:border-emerald-500/50 hover:bg-slate-800"
                }`}
              >
                Subscribe
              </a>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          All plans include a 7-day free trial. No credit card required to
          start.
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Track Record                                                      */
/* ------------------------------------------------------------------ */
function TrackRecord() {
  const months = [
    { label: "Jan", value: "72%" },
    { label: "Feb", value: "68%" },
    { label: "Mar", value: "75%" },
  ];

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Transparent Track Record
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-gray-400">
            We track every signal over rolling 90-day windows. Each signal is
            scored: hit target before stop-loss = win. Our track record is
            public and updated weekly — no cherry-picking, no survivorship bias.
          </p>

          {/* Performance placeholder cards */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {months.map((m) => (
              <div
                key={m.label}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center"
              >
                <div className="text-3xl font-bold text-emerald-400">
                  {m.value}
                </div>
                <div className="mt-1 text-sm text-gray-500">{m.label}</div>
              </div>
            ))}
          </div>

          <p className="mt-6 text-sm text-gray-500">
            Rolling 90-day signal accuracy. Updated weekly. Past performance
            does not guarantee future results.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ                                                               */
/* ------------------------------------------------------------------ */
function FAQ() {
  const faqs = [
    {
      q: "How do I execute the signals?",
      a: "You trade through your own brokerage account — we don't hold your funds or execute trades. Each signal comes with entry, target, and stop-loss levels that you can enter manually or use with your broker's order types.",
    },
    {
      q: "What's your accuracy rate?",
      a: "We publish our rolling 90-day performance openly on the site. Each signal is marked as a win (hit target before stop-loss) or loss. We update these numbers weekly so you can see exactly how the models are performing right now.",
    },
    {
      q: "Is this financial advice?",
      a: "No. SignalEdge provides stock analysis and trade ideas for educational and informational purposes. We are not a registered investment advisor. You make your own trading decisions and bear full responsibility for your outcomes.",
    },
    {
      q: "Can I cancel anytime?",
      a: "Yes. There are no long-term contracts or cancellation fees. You can cancel your subscription with one click from your account dashboard, and your access continues until the end of your current billing period.",
    },
    {
      q: "Which brokerages work with SignalEdge?",
      a: "SignalEdge is brokerage-agnostic. Our signals are designed as standalone trade ideas — you can execute them through any brokerage that supports stock trading, including Robinhood, E*TRADE, Fidelity, TD Ameritrade, and others.",
    },
    {
      q: "How quickly are signals delivered?",
      a: "Starter plan subscribers receive signals via daily email. Pro and Max subscribers get real-time push and SMS alerts the moment a signal is generated, so you can act on opportunities as they emerge.",
    },
  ];

  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mx-auto mt-12 max-w-3xl divide-y divide-slate-800">
          {faqs.map((faq) => (
            <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-medium text-white">{question}</span>
        <svg
          className={`ml-4 h-5 w-5 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>
      {open && (
        <p className="mt-3 text-sm leading-relaxed text-gray-400">{answer}</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                            */
/* ------------------------------------------------------------------ */
function Footer() {
  return (
    <footer className="border-t border-slate-800 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500 text-xs font-bold text-slate-950">
              S
            </span>
            <span className="text-sm font-semibold text-white">SignalEdge</span>
          </div>

          {/* Links */}
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} SignalEdge
          </p>
        </div>

        {/* Disclaimer */}
        <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-relaxed text-gray-600">
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
/*  Home — compose all sections                                       */
/* ------------------------------------------------------------------ */
function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Pricing />
      <TrackRecord />
      <FAQ />
      <Footer />
    </div>
  );
}
