import { useEffect, useMemo, useState } from "react";
import WiringRunsTable from "./WiringRunsTable.jsx";
import PartsInventoryTable from "./PartsInventoryTable.jsx";

const LS_KEY = "van-wiring-tracker:v1";

// You can keep your existing seed; leaving tiny placeholder here.
// If you already pasted my seed earlier, KEEP YOURS and delete this.
const seed = {
  wiringRuns: [],
  parts: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const NAV = [
  { key: "wiring", label: "Wiring Runs", sub: "Master run list + progress" },
  { key: "parts", label: "Parts Inventory", sub: "Everything you own / need" },
  // Later:
  // { key: "components", label: "Components", sub: "MPPT, Lynx, Orion, etc." },
  // { key: "connectors", label: "Connectors", sub: "Lugs, MC4, taps, etc." },
];

export default function App() {
  const saved = useMemo(() => loadState(), []);
  const [active, setActive] = useState("wiring");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [wiringRuns, setWiringRuns] = useState(saved?.wiringRuns ?? seed.wiringRuns);
  const [parts, setParts] = useState(saved?.parts ?? seed.parts);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ wiringRuns, parts }));
  }, [wiringRuns, parts]);

  const wiringStats = useMemo(() => {
    const total = wiringRuns.length;
    const done = wiringRuns.filter((r) => r.done).length;
    const needs = wiringRuns.filter((r) => r.confidence === "Needs confirm").length;
    const tbd = wiringRuns.filter((r) => r.confidence === "TBD").length;
    return { total, done, needs, tbd };
  }, [wiringRuns]);

  const current = NAV.find((n) => n.key === active);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-[480px] w-[480px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[10%] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900/70"
          >
            Menu
          </button>

          <div className="text-center">
            <div className="text-sm font-semibold leading-tight">Van Wiring Tracker</div>
            <div className="text-xs text-zinc-400">{current?.label}</div>
          </div>

          <div className="w-[52px]" />
        </div>
      </div>

      {/* Layout */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-5 md:px-6 md:py-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-[280px] shrink-0 md:block">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-800/70 bg-zinc-950/40">
                <span className="text-xs font-semibold text-zinc-200">VT</span>
              </div>
              <div>
                <div className="text-sm font-semibold">Van Wiring Tracker</div>
                <div className="text-xs text-zinc-400">Offline + auto-save</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {NAV.map((item) => (
                <NavItem
                  key={item.key}
                  active={active === item.key}
                  title={item.label}
                  subtitle={item.sub}
                  onClick={() => setActive(item.key)}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Pill label={`Total ${wiringStats.total}`} tone="neutral" />
              <Pill label={`Done ${wiringStats.done}`} tone="good" />
              <Pill label={`Needs ${wiringStats.needs}`} tone="warn" />
              <Pill label={`TBD ${wiringStats.tbd}`} tone="muted" />
            </div>

            <div className="mt-4 text-xs text-zinc-400">
              Tip: build runs + parts here, then export JSON for backups.
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          {/* Desktop header */}
          <div className="hidden md:block">
            <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {current?.label}
                  </h1>
                  <p className="mt-1 text-sm text-zinc-300">
                    {current?.sub}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Pill label={`Total ${wiringStats.total}`} tone="neutral" />
                  <Pill label={`Done ${wiringStats.done}`} tone="good" />
                  <Pill label={`Needs confirm ${wiringStats.needs}`} tone="warn" />
                  <Pill label={`TBD ${wiringStats.tbd}`} tone="muted" />
                </div>
              </div>
            </div>
          </div>

          {/* Content card */}
          <div className="mt-4 rounded-3xl border border-zinc-800/70 bg-zinc-900/20 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur md:p-6">
            {active === "wiring" ? (
              <WiringRunsTable rows={wiringRuns} setRows={setWiringRuns} />
            ) : (
              <PartsInventoryTable parts={parts} setParts={setParts} />
            )}
          </div>

          <div className="mt-4 text-xs text-zinc-400">
            Mobile-friendly by design: sidebar becomes a menu on phone.
          </div>
        </main>
      </div>

      {/* Mobile slide-over nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[86%] max-w-sm border-r border-zinc-800/70 bg-zinc-950/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <div className="text-sm font-semibold">Van Wiring Tracker</div>
                <div className="text-xs text-zinc-400">Menu</div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="px-3">
              {NAV.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setActive(item.key);
                    setMobileNavOpen(false);
                  }}
                  className={[
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    active === item.key
                      ? "border-cyan-500/30 bg-cyan-500/10"
                      : "border-zinc-800/70 bg-zinc-900/30 hover:bg-zinc-900/60",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div className="text-xs text-zinc-400">{item.sub}</div>
                </button>
              ))}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Pill label={`Total ${wiringStats.total}`} tone="neutral" />
                <Pill label={`Done ${wiringStats.done}`} tone="good" />
                <Pill label={`Needs ${wiringStats.needs}`} tone="warn" />
                <Pill label={`TBD ${wiringStats.tbd}`} tone="muted" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ active, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "w-full rounded-2xl border px-4 py-3 text-left transition",
        active
          ? "border-cyan-500/30 bg-cyan-500/10"
          : "border-zinc-800/70 bg-zinc-950/30 hover:bg-zinc-900/60",
      ].join(" ")}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-zinc-400">{subtitle}</div>
    </button>
  );
}

function Pill({ label, tone = "neutral" }) {
  const tones = {
    neutral: "border-zinc-700/70 bg-zinc-950/40 text-zinc-200",
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    muted: "border-zinc-700/70 bg-zinc-900/30 text-zinc-300",
  };

  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px]",
        tones[tone],
      ].join(" ")}
    >
      {label}
    </span>
  );
}
