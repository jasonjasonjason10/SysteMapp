// import { useEffect, useMemo, useRef, useState } from "react";
// import WiringRunsTable from "./WiringRunsTable.jsx";
// import PartsInventoryTable from "./PartsInventoryTable.jsx";
// import Guides from "./Guides.jsx";
// import Phases from "./Phases.jsx";
// import FusesTable from "./FusesTable.jsx";
// import Splash from "./Splash.jsx";

// import {
//   EMPTY_STATE,
//   loadOps,
//   saveOps,
//   downloadJSON,
//   safeParse,
//   validateOpsShape,
// } from "./utils/storage.js";

// const NAV = [
//   { key: "wiring", label: "Wiring Runs", sub: "" },
//   { key: "parts", label: "Parts Inventory", sub: "" },
//   { key: "fuses", label: "Fuses", sub: "" },
//   { key: "guides", label: "Installation Guides", sub: "" },
//   { key: "phases", label: "Build Phases", sub: "" },
// ];

// const ENTER_KEY = "van-build-ops:entered";

// function todayStamp() {
//   const d = new Date();
//   const yyyy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yyyy}-${mm}-${dd}`;
// }

// export default function App() {
//   // ✅ Splash gate
//   const [hasEntered, setHasEntered] = useState(() => {
//     return localStorage.getItem(ENTER_KEY) === "1";
//   });

//   function enterApp() {
//     localStorage.setItem(ENTER_KEY, "1");
//     setHasEntered(true);
//   }

//   const [active, setActive] = useState("wiring");
//   const [mobileNavOpen, setMobileNavOpen] = useState(false);

//   const [ops, setOps] = useState(() => loadOps() ?? EMPTY_STATE);

//   // ✅ Back-compat / safety: ensure new keys exist on older saved backups
//   useEffect(() => {
//     setOps((o) => {
//       const next = o && typeof o === "object" ? o : EMPTY_STATE;

//       // ensure arrays
//       const parts = Array.isArray(next.parts) ? next.parts : [];
//       const wiringRuns = Array.isArray(next.wiringRuns) ? next.wiringRuns : [];
//       const phases = Array.isArray(next.phases) ? next.phases : [];
//       const guideTree = Array.isArray(next.guideTree) ? next.guideTree : [];
//       const fuses = Array.isArray(next.fuses) ? next.fuses : []; // NEW

//       // ensure objects
//       const guidesById =
//         next.guidesById &&
//         typeof next.guidesById === "object" &&
//         !Array.isArray(next.guidesById)
//           ? next.guidesById
//           : {};

//       // If nothing was missing, avoid re-render loops
//       const unchanged =
//         parts === next.parts &&
//         wiringRuns === next.wiringRuns &&
//         phases === next.phases &&
//         guideTree === next.guideTree &&
//         guidesById === next.guidesById &&
//         fuses === next.fuses;

//       if (unchanged) return next;

//       return {
//         ...next,
//         parts,
//         wiringRuns,
//         phases,
//         guideTree,
//         guidesById,
//         fuses,
//       };
//     });
//   }, []);

//   // Global autosave (entire ops system)
//   useEffect(() => {
//     saveOps(ops);
//   }, [ops]);

//   // Global export/import
//   const importRef = useRef(null);

//   function exportBackup() {
//     downloadJSON(`van-build-ops-backup-${todayStamp()}.json`, ops);
//   }

//   function onImportBackupFile(e) {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = () => {
//       const parsed = safeParse(String(reader.result || ""));
//       if (!validateOpsShape(parsed)) {
//         alert(
//           "Import failed: file does not look like a Van Build Ops backup JSON.",
//         );
//         return;
//       }
//       const ok = confirm(
//         "Import backup and replace current data?\n\nTip: Export a backup first if you want a restore point.",
//       );
//       if (!ok) return;
//       setOps(parsed);
//     };
//     reader.readAsText(file);
//     e.target.value = "";
//   }

//   function resetAll() {
//     const ok = confirm(
//       "Reset the ENTIRE Ops System? This clears all saved data.",
//     );
//     if (!ok) return;
//     setOps(EMPTY_STATE);
//   }

//   const current = NAV.find((n) => n.key === active);

//   // Wiring stats (only relevant on wiring tab, but fine to show globally)
//   const wiringStats = useMemo(() => {
//     const rows = ops.wiringRuns || [];
//     const total = rows.length;
//     const done = rows.filter((r) => r.done).length;
//     const needs = rows.filter(
//       (r) => r.confidence === "needs_confirmation",
//     ).length;
//     const tbd = rows.filter((r) => r.confidence === "tbd").length;
//     const issues = rows.filter((r) => r.status === "issue").length;
//     return { total, done, needs, tbd, issues };
//   }, [ops.wiringRuns]);

//   // ✅ Show Splash first
//   if (!hasEntered) {
//     return <Splash onContinue={enterApp} />;
//   }

//   return (
//     <div className="min-h-screen text-zinc-100">
//       {/* background glow */}
//       <div className="pointer-events-none fixed inset-0 -z-10">
//         <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
//         <div className="absolute right-[-10%] top-[10%] h-[480px] w-[480px] rounded-full bg-fuchsia-500/10 blur-3xl" />
//         <div className="absolute bottom-[-20%] left-[10%] h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
//       </div>

//       {/* Mobile top bar */}
//       <div className="sticky top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur md:hidden">
//         <div className="flex items-center justify-between px-4 py-3">
//           <button
//             onClick={() => setMobileNavOpen(true)}
//             className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900/70"
//           >
//             Menu
//           </button>

//           <div className="text-center">
//             <div className="text-sm font-semibold leading-tight">
//               Van Build Ops
//             </div>
//             <div className="text-xs text-zinc-400">{current?.label}</div>
//           </div>

//           <div className="w-[52px]" />
//         </div>
//       </div>

//       {/* Layout */}
//       <div className="mx-auto flex max-w-7xl gap-6 px-4 py-5 md:px-6 md:py-8">
//         {/* Desktop sidebar */}
//         <aside className="hidden w-[300px] shrink-0 md:block">
//           <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
//             <div className="flex items-center gap-3 px-2 py-2">
//               <div className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-800/70 bg-zinc-950/40">
//                 <span className="text-xs font-semibold text-zinc-200">OPS</span>
//               </div>
//               <div>
//                 <div className="text-sm font-semibold">Van Build Ops</div>
//                 <div className="text-xs text-zinc-400">Offline + auto-save</div>
//               </div>
//             </div>

//             <div className="mt-4 space-y-2">
//               {NAV.map((item) => (
//                 <NavItem
//                   key={item.key}
//                   active={active === item.key}
//                   title={item.label}
//                   subtitle={item.sub}
//                   onClick={() => setActive(item.key)}
//                 />
//               ))}
//             </div>

//             <div className="mt-4 grid grid-cols-2 gap-2">
//               <Pill label={`Runs ${wiringStats.total}`} tone="neutral" />
//               <Pill label={`Done ${wiringStats.done}`} tone="good" />
//               <Pill label={`Needs ${wiringStats.needs}`} tone="warn" />
//               <Pill label={`TBD ${wiringStats.tbd}`} tone="muted" />
//               <Pill label={`Issues ${wiringStats.issues}`} tone="warn" />
//               <div />
//             </div>

//             <div className="mt-4 flex flex-col gap-2">
//               <button
//                 onClick={exportBackup}
//                 className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
//               >
//                 Export Backup (JSON)
//               </button>
//               <button
//                 onClick={() => importRef.current?.click()}
//                 className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
//               >
//                 Import Backup (JSON)
//               </button>
//               <button
//                 onClick={resetAll}
//                 className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm hover:bg-red-950/60"
//               >
//                 Reset Entire App
//               </button>
//               <input
//                 ref={importRef}
//                 type="file"
//                 accept="application/json"
//                 className="hidden"
//                 onChange={onImportBackupFile}
//               />
//             </div>

//             <div className="mt-3 text-xs text-zinc-400">
//               Tip: Export daily backups to your hard drive.
//             </div>
//           </div>
//         </aside>

//         {/* Main */}
//         <main className="min-w-0 flex-1">
//           {/* Desktop header */}
//           <div className="hidden md:block">
//             <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
//               <div className="flex items-center justify-between gap-4">
//                 <div>
//                   <h1 className="text-2xl font-semibold tracking-tight">
//                     {current?.label}
//                   </h1>
//                   <p className="mt-1 text-sm text-zinc-300">{current?.sub}</p>
//                 </div>

//                 <div className="flex flex-wrap items-center gap-2">
//                   <button
//                     onClick={exportBackup}
//                     className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
//                   >
//                     Export Backup
//                   </button>
//                   <button
//                     onClick={() => importRef.current?.click()}
//                     className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
//                   >
//                     Import Backup
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Content card */}
//           <div className="mt-4 rounded-3xl border border-zinc-800/70 bg-zinc-900/20 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur md:p-6">
//             {active === "wiring" && (
//               <WiringRunsTable
//                 rows={ops.wiringRuns}
//                 setRows={(updater) =>
//                   setOps((o) => {
//                     const prev = Array.isArray(o.wiringRuns)
//                       ? o.wiringRuns
//                       : [];
//                     const next =
//                       typeof updater === "function" ? updater(prev) : updater;
//                     return {
//                       ...o,
//                       wiringRuns: Array.isArray(next) ? next : prev,
//                     };
//                   })
//                 }
//               />
//             )}

//             {active === "parts" && (
//               <PartsInventoryTable
//                 parts={ops.parts}
//                 setParts={(updater) =>
//                   setOps((o) => {
//                     const prev = Array.isArray(o.parts) ? o.parts : [];
//                     const next =
//                       typeof updater === "function" ? updater(prev) : updater;
//                     return { ...o, parts: Array.isArray(next) ? next : prev };
//                   })
//                 }
//               />
//             )}

//             {active === "fuses" && (
//               <FusesTable
//                 fuses={ops.fuses}
//                 setFuses={(updater) =>
//                   setOps((o) => {
//                     const prev = Array.isArray(o.fuses) ? o.fuses : [];
//                     const next =
//                       typeof updater === "function" ? updater(prev) : updater;
//                     return { ...o, fuses: Array.isArray(next) ? next : prev };
//                   })
//                 }
//               />
//             )}

//             {active === "guides" && (
//               <Guides
//                 guidesById={ops.guidesById}
//                 guideTree={ops.guideTree}
//                 setGuidesById={(updater) =>
//                   setOps((o) => {
//                     const prev =
//                       o.guidesById &&
//                       typeof o.guidesById === "object" &&
//                       !Array.isArray(o.guidesById)
//                         ? o.guidesById
//                         : {};
//                     const next =
//                       typeof updater === "function" ? updater(prev) : updater;
//                     const safeNext =
//                       next && typeof next === "object" && !Array.isArray(next)
//                         ? next
//                         : prev;
//                     return { ...o, guidesById: safeNext };
//                   })
//                 }
//                 setGuideTree={(updater) =>
//                   setOps((o) => {
//                     const prev = Array.isArray(o.guideTree) ? o.guideTree : [];
//                     const next =
//                       typeof updater === "function" ? updater(prev) : updater;
//                     return {
//                       ...o,
//                       guideTree: Array.isArray(next) ? next : prev,
//                     };
//                   })
//                 }
//               />
//             )}

//             {active === "phases" && (
//               <Phases
//                 phases={ops.phases}
//                 setPhases={(updater) =>
//                   setOps((o) => {
//                     const prev = Array.isArray(o.phases) ? o.phases : [];
//                     const next =
//                       typeof updater === "function" ? updater(prev) : updater;

//                     return {
//                       ...o,
//                       phases: Array.isArray(next) ? next : prev, // never allow corruption
//                     };
//                   })
//                 }
//               />
//             )}
//           </div>

//           <div className="mt-4 text-xs text-zinc-400">
//             Phone-first UI: sidebar becomes a menu on mobile.
//           </div>
//         </main>
//       </div>

//       {/* Mobile slide-over nav */}
//       {mobileNavOpen && (
//         <div className="fixed inset-0 z-50 md:hidden">
//           <div
//             className="absolute inset-0 bg-black/70"
//             onClick={() => setMobileNavOpen(false)}
//           />
//           <div className="absolute left-0 top-0 h-full w-[86%] max-w-sm border-r border-zinc-800/70 bg-zinc-950/90 backdrop-blur">
//             <div className="flex items-center justify-between px-4 py-4">
//               <div>
//                 <div className="text-sm font-semibold">Van Build Ops</div>
//                 <div className="text-xs text-zinc-400">Menu</div>
//               </div>
//               <button
//                 onClick={() => setMobileNavOpen(false)}
//                 className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 text-sm"
//               >
//                 Close
//               </button>
//             </div>

//             <div className="px-3 space-y-2">
//               {NAV.map((item) => (
//                 <button
//                   key={item.key}
//                   onClick={() => {
//                     setActive(item.key);
//                     setMobileNavOpen(false);
//                   }}
//                   className={[
//                     "w-full rounded-2xl border px-4 py-3 text-left transition",
//                     active === item.key
//                       ? "border-cyan-500/30 bg-cyan-500/10"
//                       : "border-zinc-800/70 bg-zinc-900/30 hover:bg-zinc-900/60",
//                   ].join(" ")}
//                 >
//                   <div className="text-sm font-semibold">{item.label}</div>
//                   <div className="text-xs text-zinc-400">{item.sub}</div>
//                 </button>
//               ))}

//               <div className="pt-3 space-y-2">
//                 <button
//                   onClick={exportBackup}
//                   className="w-full rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
//                 >
//                   Export Backup
//                 </button>
//                 <button
//                   onClick={() => importRef.current?.click()}
//                   className="w-full rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
//                 >
//                   Import Backup
//                 </button>
//               </div>

//               <input
//                 ref={importRef}
//                 type="file"
//                 accept="application/json"
//                 className="hidden"
//                 onChange={onImportBackupFile}
//               />
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// function NavItem({ active, title, subtitle, onClick }) {
//   return (
//     <button
//       onClick={onClick}
//       className={[
//         "w-full rounded-2xl border px-4 py-3 text-left transition",
//         active
//           ? "border-cyan-500/30 bg-cyan-500/10"
//           : "border-zinc-800/70 bg-zinc-950/30 hover:bg-zinc-900/60",
//       ].join(" ")}
//     >
//       <div className="text-sm font-semibold">{title}</div>
//       <div className="text-xs text-zinc-400">{subtitle}</div>
//     </button>
//   );
// }

// function Pill({ label, tone = "neutral" }) {
//   const tones = {
//     neutral: "border-zinc-700/70 bg-zinc-950/40 text-zinc-200",
//     good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
//     warn: "border-amber-500/30 bg-amber-500/10 text-amber-200",
//     muted: "border-zinc-700/70 bg-zinc-900/30 text-zinc-300",
//   };

//   return (
//     <span
//       className={[
//         "inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px]",
//         tones[tone],
//       ].join(" ")}
//     >
//       {label}
//     </span>
//   );
// }

import { useEffect, useMemo, useRef, useState } from "react";
import WiringRunsTable from "./WiringRunsTable.jsx";
import PartsInventoryTable from "./PartsInventoryTable.jsx";
import Guides from "./Guides.jsx";
import Phases from "./Phases.jsx";
import FusesTable from "./FusesTable.jsx";
// import Splash from "./Splash.jsx";

import {
  EMPTY_STATE,
  loadOps,
  saveOps,
  downloadJSON,
  safeParse,
  validateOpsShape,
} from "./utils/storage.js";

const NAV = [
  { key: "wiring", label: "Wiring Runs", sub: "" },
  { key: "parts", label: "Parts Inventory", sub: "" },
  { key: "fuses", label: "Fuses", sub: "" },
  { key: "guides", label: "Installation Guides", sub: "" },
  { key: "phases", label: "Build Phases", sub: "" },
];

function todayStamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function App() {
  const [active, setActive] = useState("wiring");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [ops, setOps] = useState(() => loadOps() ?? EMPTY_STATE);

  // ✅ Back-compat / safety: ensure new keys exist on older saved backups
  useEffect(() => {
    setOps((o) => {
      const next = o && typeof o === "object" ? o : EMPTY_STATE;

      // ensure arrays
      const parts = Array.isArray(next.parts) ? next.parts : [];
      const wiringRuns = Array.isArray(next.wiringRuns) ? next.wiringRuns : [];
      const phases = Array.isArray(next.phases) ? next.phases : [];
      const guideTree = Array.isArray(next.guideTree) ? next.guideTree : [];
      const fuses = Array.isArray(next.fuses) ? next.fuses : []; // NEW

      // ensure objects
      const guidesById =
        next.guidesById &&
        typeof next.guidesById === "object" &&
        !Array.isArray(next.guidesById)
          ? next.guidesById
          : {};

      // If nothing was missing, avoid re-render loops
      const unchanged =
        parts === next.parts &&
        wiringRuns === next.wiringRuns &&
        phases === next.phases &&
        guideTree === next.guideTree &&
        guidesById === next.guidesById &&
        fuses === next.fuses;

      if (unchanged) return next;

      return {
        ...next,
        parts,
        wiringRuns,
        phases,
        guideTree,
        guidesById,
        fuses,
      };
    });
  }, []);

  // Global autosave (entire ops system)
  useEffect(() => {
    saveOps(ops);
  }, [ops]);

  // Global export/import
  const importRef = useRef(null);

  function exportBackup() {
    downloadJSON(`van-build-ops-backup-${todayStamp()}.json`, ops);
  }

  function onImportBackupFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const parsed = safeParse(String(reader.result || ""));
      if (!validateOpsShape(parsed)) {
        alert(
          "Import failed: file does not look like a Van Build Ops backup JSON.",
        );
        return;
      }
      const ok = confirm(
        "Import backup and replace current data?\n\nTip: Export a backup first if you want a restore point.",
      );
      if (!ok) return;
      setOps(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function resetAll() {
    const ok = confirm(
      "Reset the ENTIRE Ops System? This clears all saved data.",
    );
    if (!ok) return;
    setOps(EMPTY_STATE);
  }

  const current = NAV.find((n) => n.key === active);

  // Wiring stats (only relevant on wiring tab, but fine to show globally)
  const wiringStats = useMemo(() => {
    const rows = ops.wiringRuns || [];
    const total = rows.length;
    const done = rows.filter((r) => r.done).length;
    const needs = rows.filter(
      (r) => r.confidence === "needs_confirmation",
    ).length;
    const tbd = rows.filter((r) => r.confidence === "tbd").length;
    const issues = rows.filter((r) => r.status === "issue").length;
    return { total, done, needs, tbd, issues };
  }, [ops.wiringRuns]);

  return (
    <div className="min-h-screen text-zinc-100">
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
            <div className="text-sm font-semibold leading-tight">
              Van Build Ops
            </div>
            <div className="text-xs text-zinc-400">{current?.label}</div>
          </div>

          <div className="w-[52px]" />
        </div>
      </div>

      {/* Layout */}
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-5 md:px-6 md:py-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-[300px] shrink-0 md:block">
          <div className="rounded-3xl border border-zinc-800/70 bg-zinc-900/30 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-zinc-800/70 bg-zinc-950/40">
                <span className="text-xs font-semibold text-zinc-200">OPS</span>
              </div>
              <div>
                <div className="text-sm font-semibold">Van Build Ops</div>
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
              <Pill label={`Runs ${wiringStats.total}`} tone="neutral" />
              <Pill label={`Done ${wiringStats.done}`} tone="good" />
              <Pill label={`Needs ${wiringStats.needs}`} tone="warn" />
              <Pill label={`TBD ${wiringStats.tbd}`} tone="muted" />
              <Pill label={`Issues ${wiringStats.issues}`} tone="warn" />
              <div />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={exportBackup}
                className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
              >
                Export Backup (JSON)
              </button>
              <button
                onClick={() => importRef.current?.click()}
                className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
              >
                Import Backup (JSON)
              </button>
              <button
                onClick={resetAll}
                className="rounded-2xl border border-red-900/60 bg-red-950/30 px-4 py-2 text-sm hover:bg-red-950/60"
              >
                Reset Entire App
              </button>
              <input
                ref={importRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onImportBackupFile}
              />
            </div>

            <div className="mt-3 text-xs text-zinc-400">
              Tip: Export daily backups to your hard drive.
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
                  <p className="mt-1 text-sm text-zinc-300">{current?.sub}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={exportBackup}
                    className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
                  >
                    Export Backup
                  </button>
                  <button
                    onClick={() => importRef.current?.click()}
                    className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
                  >
                    Import Backup
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Content card */}
          <div className="mt-4 rounded-3xl border border-zinc-800/70 bg-zinc-900/20 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur md:p-6">
            {active === "wiring" && (
              <WiringRunsTable
                rows={ops.wiringRuns}
                setRows={(updater) =>
                  setOps((o) => {
                    const prev = Array.isArray(o.wiringRuns)
                      ? o.wiringRuns
                      : [];
                    const next =
                      typeof updater === "function" ? updater(prev) : updater;
                    return {
                      ...o,
                      wiringRuns: Array.isArray(next) ? next : prev,
                    };
                  })
                }
              />
            )}

            {active === "parts" && (
              <PartsInventoryTable
                parts={ops.parts}
                setParts={(updater) =>
                  setOps((o) => {
                    const prev = Array.isArray(o.parts) ? o.parts : [];
                    const next =
                      typeof updater === "function" ? updater(prev) : updater;
                    return { ...o, parts: Array.isArray(next) ? next : prev };
                  })
                }
              />
            )}

            {active === "fuses" && (
              <FusesTable
                fuses={ops.fuses}
                setFuses={(updater) =>
                  setOps((o) => {
                    const prev = Array.isArray(o.fuses) ? o.fuses : [];
                    const next =
                      typeof updater === "function" ? updater(prev) : updater;
                    return { ...o, fuses: Array.isArray(next) ? next : prev };
                  })
                }
              />
            )}

            {active === "guides" && (
              <Guides
                guidesById={ops.guidesById}
                guideTree={ops.guideTree}
                setGuidesById={(updater) =>
                  setOps((o) => {
                    const prev =
                      o.guidesById &&
                      typeof o.guidesById === "object" &&
                      !Array.isArray(o.guidesById)
                        ? o.guidesById
                        : {};
                    const next =
                      typeof updater === "function" ? updater(prev) : updater;
                    const safeNext =
                      next && typeof next === "object" && !Array.isArray(next)
                        ? next
                        : prev;
                    return { ...o, guidesById: safeNext };
                  })
                }
                setGuideTree={(updater) =>
                  setOps((o) => {
                    const prev = Array.isArray(o.guideTree) ? o.guideTree : [];
                    const next =
                      typeof updater === "function" ? updater(prev) : updater;
                    return {
                      ...o,
                      guideTree: Array.isArray(next) ? next : prev,
                    };
                  })
                }
              />
            )}

            {active === "phases" && (
              <Phases
                phases={ops.phases}
                setPhases={(updater) =>
                  setOps((o) => {
                    const prev = Array.isArray(o.phases) ? o.phases : [];
                    const next =
                      typeof updater === "function" ? updater(prev) : updater;

                    return {
                      ...o,
                      phases: Array.isArray(next) ? next : prev, // never allow corruption
                    };
                  })
                }
              />
            )}
          </div>

          <div className="mt-4 text-xs text-zinc-400">
            Phone-first UI: sidebar becomes a menu on mobile.
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
                <div className="text-sm font-semibold">Van Build Ops</div>
                <div className="text-xs text-zinc-400">Menu</div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="rounded-xl border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="px-3 space-y-2">
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

              <div className="pt-3 space-y-2">
                <button
                  onClick={exportBackup}
                  className="w-full rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
                >
                  Export Backup
                </button>
                <button
                  onClick={() => importRef.current?.click()}
                  className="w-full rounded-2xl border border-zinc-800/70 bg-zinc-950/40 px-4 py-2 text-sm hover:bg-zinc-900/60"
                >
                  Import Backup
                </button>
              </div>

              <input
                ref={importRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onImportBackupFile}
              />
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
