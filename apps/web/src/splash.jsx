import { useEffect } from "react";

export default function Splash({ onContinue, remember = true }) {
  // Press Enter to continue (nice UX)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Enter") onContinue?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onContinue]);

  return (
    <div className="min-h-screen text-zinc-100 grid place-items-center px-6">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-[480px] w-[480px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[10%] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-xl">
        <div className="rounded-[32px] border border-zinc-800/70 bg-zinc-950/30 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
          <div className="grid place-items-center">
            {/* “spinning platform” stage */}
            <div className="relative grid place-items-center">
              {/* platform */}
              <div className="absolute -bottom-8 h-14 w-72 rounded-full bg-zinc-950/60 blur-[1px]" />
              <div className="absolute -bottom-7 h-12 w-64 rounded-full border border-zinc-800/70 bg-zinc-950/50" />
              <div className="absolute -bottom-6 h-10 w-56 rounded-full border border-zinc-800/70 bg-zinc-900/30" />

              {/* spinning ring */}
              <div className="absolute h-40 w-40 rounded-full border border-cyan-500/25 animate-spin-slow" />

              {/* LOGO placeholder */}
              {/* Replace text with your actual logo image later */}
              <div className="grid h-36 w-36 place-items-center rounded-3xl border border-zinc-800/70 bg-zinc-950/50 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                <div className="text-center">
                  <div className="text-xs tracking-[0.28em] text-zinc-400">
                    VAN BUILD
                  </div>
                  <div className="mt-1 text-xl font-semibold">OPS</div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <div className="text-sm text-zinc-300">
                Your offline build tracker
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                Press Enter or click Continue
              </div>

              <button
                onClick={onContinue}
                className="mt-5 rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-6 py-3 text-sm hover:bg-zinc-900/60"
              >
                Continue
              </button>

              {remember && (
                <div className="mt-3 text-[11px] text-zinc-500">
                  (We can later add a “show this every time” toggle.)
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-zinc-500">
          v1 • local autosave • backups supported
        </div>
      </div>

      {/* Tailwind animation helper */}
      <style>{`
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spinSlow 6s linear infinite; }
      `}</style>
    </div>
  );
}

