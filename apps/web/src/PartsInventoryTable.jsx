import { useMemo, useState } from "react";

function uid(prefix = "PT") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

function isWirePart(p) {
  const hay = [p?.name, p?.category, p?.notes].filter(Boolean).join(" ").toLowerCase();
  const wireHints = ["awg", "wire", "cable", "duplex", "triplex", "welding", "pv", "mc4"];
  return wireHints.some((h) => hay.includes(h));
}

const WIRE_USE_OPTIONS = [
  "Battery Positive",
  "Battery Negative",
  "DC Distribution",
  "AC Shore",
  "Inverter Feed",
  "Solar PV",
  "Alternator / DC-DC",
  "Fridge",
  "Diesel Heater",
  "Lights",
  "Outlets",
  "Spare / Future",
];

function normalizePart(p) {
  const part = p && typeof p === "object" ? p : {};

  const purchasedFeet = Number.isFinite(Number(part.purchasedFeet))
    ? Number(part.purchasedFeet)
    : 0;

  const usedFeet = Number.isFinite(Number(part.usedFeet))
    ? Number(part.usedFeet)
    : 0;

  return {
    id: typeof part.id === "string" && part.id ? part.id : uid("PT"),
    name: typeof part.name === "string" ? part.name : "New Part",
    category: typeof part.category === "string" ? part.category : "",
    vendor: typeof part.vendor === "string" ? part.vendor : "",
    qtyOwned: Number.isFinite(Number(part.qtyOwned)) ? Number(part.qtyOwned) : 0,
    qtyNeed: Number.isFinite(Number(part.qtyNeed)) ? Number(part.qtyNeed) : 0,
    status: typeof part.status === "string" ? part.status : "tbd",
    notes: typeof part.notes === "string" ? part.notes : "",

    haveCorrectLugs: Boolean(part.haveCorrectLugs ?? false),
    haveHeatShrink: Boolean(part.haveHeatShrink ?? false),
    haveConnectors: Boolean(part.haveConnectors ?? false),

    // 🔥 WIRE TRACKING
    purchasedFeet,
    usedFeet,
    wireUses: Array.isArray(part.wireUses) ? part.wireUses : [],
  };
}

export default function PartsInventoryTable({ parts, setParts }) {
  const safeParts = useMemo(() => {
    const base = Array.isArray(parts) ? parts : [];
    return base.map(normalizePart);
  }, [parts]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [wiresOnly, setWiresOnly] = useState(false);
  const [terminationReadyOnly, setTerminationReadyOnly] = useState(false);

  const stats = useMemo(() => {
    const total = safeParts.length;
    const wires = safeParts.filter((p) => isWirePart(p)).length;
    const lowStock = safeParts.filter(
      (p) => isWirePart(p) && p.purchasedFeet - p.usedFeet < 5
    ).length;

    return { total, wires, lowStock };
  }, [safeParts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...safeParts];

    if (status !== "all") list = list.filter((p) => (p.status || "tbd") === status);
    if (wiresOnly) list = list.filter((p) => isWirePart(p));

    if (terminationReadyOnly) {
      list = list.filter(
        (p) =>
          isWirePart(p) &&
          p.haveCorrectLugs &&
          p.haveHeatShrink &&
          p.haveConnectors
      );
    }

    if (q) {
      list = list.filter((p) =>
        [p.name, p.category, p.vendor, p.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return list;
  }, [safeParts, query, status, wiresOnly, terminationReadyOnly]);

  function updatePart(id, patch) {
    setParts((prev) =>
      (Array.isArray(prev) ? prev : []).map((p) =>
        p.id === id ? { ...normalizePart(p), ...patch } : p
      )
    );
  }

  function toggleWireUse(id, use) {
    const part = safeParts.find((p) => p.id === id);
    if (!part) return;

    const exists = part.wireUses.includes(use);
    const next = exists
      ? part.wireUses.filter((u) => u !== use)
      : [...part.wireUses, use];

    updatePart(id, { wireUses: next });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-lg font-semibold">Parts Inventory</h2>

        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
            Total <b>{stats.total}</b>
          </span>
          <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
            Wires <b>{stats.wires}</b>
          </span>
          <span className="rounded-full border border-red-800 bg-red-950/30 px-3 py-1">
            Low Stock (&lt;5ft) <b>{stats.lowStock}</b>
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-auto max-h-[72vh]">
        <table className="min-w-[1900px] w-full">
          <thead className="sticky top-0 bg-zinc-900">
            <tr>
              {[
                "Name",
                "Purchased ft",
                "Used ft",
                "Remaining",
                "Wire Uses",
                "Lugs",
                "Shrink",
                "Conn",
                "Notes",
              ].map((h) => (
                <th
                  key={h}
                  className="border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase text-zinc-300"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filtered.map((p) => {
              const wire = isWirePart(p);
              const remaining = p.purchasedFeet - p.usedFeet;
              const lowStock = wire && remaining < 5;

              return (
                <tr key={p.id} className={cx(lowStock && "bg-red-950/20")}>
                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      value={p.name}
                      onChange={(e) =>
                        updatePart(p.id, { name: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire && (
                      <input
                        type="number"
                        value={p.purchasedFeet}
                        onChange={(e) =>
                          updatePart(p.id, {
                            purchasedFeet: Number(e.target.value),
                          })
                        }
                        className="w-24 bg-zinc-950 border border-zinc-800 rounded px-2 py-1"
                      />
                    )}
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire && (
                      <input
                        type="number"
                        value={p.usedFeet}
                        onChange={(e) =>
                          updatePart(p.id, {
                            usedFeet: Number(e.target.value),
                          })
                        }
                        className="w-24 bg-zinc-950 border border-zinc-800 rounded px-2 py-1"
                      />
                    )}
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire && (
                      <span
                        className={cx(
                          "font-semibold",
                          lowStock ? "text-red-400" : "text-emerald-300"
                        )}
                      >
                        {remaining} ft
                      </span>
                    )}
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire && (
                      <div className="flex flex-wrap gap-2">
                        {WIRE_USE_OPTIONS.map((use) => (
                          <button
                            key={use}
                            onClick={() => toggleWireUse(p.id, use)}
                            className={cx(
                              "text-xs px-2 py-1 rounded border",
                              p.wireUses.includes(use)
                                ? "bg-cyan-500/20 border-cyan-500/40"
                                : "bg-zinc-950 border-zinc-800"
                            )}
                          >
                            {use}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <button
                      onClick={() =>
                        updatePart(p.id, {
                          haveCorrectLugs: !p.haveCorrectLugs,
                        })
                      }
                      className={cx(
                        "px-2 py-1 rounded border text-sm",
                        p.haveCorrectLugs
                          ? "bg-emerald-500/20 border-emerald-500/40"
                          : "bg-zinc-950 border-zinc-800"
                      )}
                    >
                      {p.haveCorrectLugs ? "Yes" : "No"}
                    </button>
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <button
                      onClick={() =>
                        updatePart(p.id, {
                          haveHeatShrink: !p.haveHeatShrink,
                        })
                      }
                      className={cx(
                        "px-2 py-1 rounded border text-sm",
                        p.haveHeatShrink
                          ? "bg-emerald-500/20 border-emerald-500/40"
                          : "bg-zinc-950 border-zinc-800"
                      )}
                    >
                      {p.haveHeatShrink ? "Yes" : "No"}
                    </button>
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <button
                      onClick={() =>
                        updatePart(p.id, {
                          haveConnectors: !p.haveConnectors,
                        })
                      }
                      className={cx(
                        "px-2 py-1 rounded border text-sm",
                        p.haveConnectors
                          ? "bg-emerald-500/20 border-emerald-500/40"
                          : "bg-zinc-950 border-zinc-800"
                      )}
                    >
                      {p.haveConnectors ? "Yes" : "No"}
                    </button>
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      value={p.notes}
                      onChange={(e) =>
                        updatePart(p.id, { notes: e.target.value })
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Remaining wire highlights red if under 5ft.
      </p>
    </div>
  );
}


// import { useMemo, useState } from "react";

// function uid(prefix = "PT") {
//   const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
//   const time = Date.now().toString(16).slice(-4).toUpperCase();
//   return `${prefix}-${time}${rand}`;
// }

// function cx(...c) {
//   return c.filter(Boolean).join(" ");
// }

// // Heuristic so you don’t have to manually tag every wire on day 1.
// // You can refine later by adding a real field like partType: "wire".
// function isWirePart(p) {
//   const hay = [p?.name, p?.category, p?.notes].filter(Boolean).join(" ").toLowerCase();
//   const wireHints = ["awg", "wire", "cable", "duplex", "triplex", "welding", "pv", "mc4"];
//   return wireHints.some((h) => hay.includes(h));
// }

// function normalizePart(p) {
//   const part = p && typeof p === "object" ? p : {};
//   return {
//     id: typeof part.id === "string" && part.id ? part.id : uid("PT"),
//     name: typeof part.name === "string" ? part.name : "New Part",
//     category: typeof part.category === "string" ? part.category : "",
//     vendor: typeof part.vendor === "string" ? part.vendor : "",
//     qtyOwned: Number.isFinite(Number(part.qtyOwned)) ? Number(part.qtyOwned) : 0,
//     qtyNeed: Number.isFinite(Number(part.qtyNeed)) ? Number(part.qtyNeed) : 0,
//     status: typeof part.status === "string" ? part.status : "tbd", // tbd | ordered | owned | installed | needed | partial
//     notes: typeof part.notes === "string" ? part.notes : "",

//     // NEW FLAGS (booleans)
//     haveCorrectLugs: Boolean(part.haveCorrectLugs ?? false),
//     haveHeatShrink: Boolean(part.haveHeatShrink ?? false),
//     haveConnectors: Boolean(part.haveConnectors ?? false),
//   };
// }

// export default function PartsInventoryTable({ parts, setParts }) {
//   const safeParts = useMemo(() => {
//     const base = Array.isArray(parts) ? parts : [];
//     return base.map(normalizePart);
//   }, [parts]);

//   const [query, setQuery] = useState("");
//   const [status, setStatus] = useState("all");

//   // NEW FILTERS
//   const [wiresOnly, setWiresOnly] = useState(false);
//   const [terminationReadyOnly, setTerminationReadyOnly] = useState(false);

//   const stats = useMemo(() => {
//     const total = safeParts.length;
//     const owned = safeParts.filter((p) => Number(p.qtyOwned || 0) > 0).length;
//     const needed = safeParts.filter((p) => Number(p.qtyNeed || 0) > 0).length;
//     const wires = safeParts.filter((p) => isWirePart(p)).length;
//     const termReady = safeParts.filter(
//       (p) => isWirePart(p) && p.haveCorrectLugs && p.haveHeatShrink && p.haveConnectors,
//     ).length;
//     return { total, owned, needed, wires, termReady };
//   }, [safeParts]);

//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     let list = [...safeParts];

//     if (status !== "all") list = list.filter((p) => (p.status || "tbd") === status);

//     if (wiresOnly) list = list.filter((p) => isWirePart(p));

//     if (terminationReadyOnly) {
//       list = list.filter(
//         (p) =>
//           isWirePart(p) &&
//           Boolean(p.haveCorrectLugs) &&
//           Boolean(p.haveHeatShrink) &&
//           Boolean(p.haveConnectors),
//       );
//     }

//     if (q) {
//       list = list.filter((p) => {
//         const hay = [p.name, p.category, p.vendor, p.notes]
//           .filter(Boolean)
//           .join(" ")
//           .toLowerCase();
//         return hay.includes(q);
//       });
//     }

//     return list;
//   }, [safeParts, query, status, wiresOnly, terminationReadyOnly]);

//   function addPart() {
//     const part = normalizePart({
//       id: uid("PT"),
//       name: "New Part",
//       category: "",
//       vendor: "",
//       qtyOwned: 0,
//       qtyNeed: 1,
//       status: "tbd",
//       notes: "",
//       haveCorrectLugs: false,
//       haveHeatShrink: false,
//       haveConnectors: false,
//     });

//     setParts((prev) => {
//       const base = Array.isArray(prev) ? prev : [];
//       return [part, ...base];
//     });
//   }

//   function updatePart(id, patch) {
//     setParts((prev) => {
//       const base = Array.isArray(prev) ? prev : [];
//       return base.map((p) => (p.id === id ? { ...normalizePart(p), ...patch } : p));
//     });
//   }

//   function deletePart(id) {
//     const ok = confirm("Delete this part?");
//     if (!ok) return;

//     setParts((prev) => {
//       const base = Array.isArray(prev) ? prev : [];
//       return base.filter((p) => p.id !== id);
//     });
//   }

//   function toggleFlag(id, key) {
//     const found = safeParts.find((p) => p.id === id);
//     if (!found) return;
//     updatePart(id, { [key]: !Boolean(found[key]) });
//   }

//   return (
//     <div className="space-y-4">
//       <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
//         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//           <div>
//             <h2 className="text-lg font-semibold">Parts Inventory</h2>
//             <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Total <b>{stats.total}</b>
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Owned <b>{stats.owned}</b>
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Need <b>{stats.needed}</b>
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Wires <b>{stats.wires}</b>
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Term-ready <b>{stats.termReady}</b>
//               </span>
//             </div>
//           </div>

//           <button
//             onClick={addPart}
//             className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
//           >
//             + Add Part
//           </button>
//         </div>

//         <div className="mt-4 flex flex-col gap-2">
//           <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//             <input
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder="Search (victron, fuse, wire, bus bar...)"
//               className="w-full sm:w-[520px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
//             />

//             <select
//               value={status}
//               onChange={(e) => setStatus(e.target.value)}
//               className="w-full sm:w-[220px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
//             >
//               <option value="all">All status</option>
//               <option value="tbd">TBD</option>
//               <option value="needed">Needed</option>
//               <option value="partial">Partial</option>
//               <option value="ordered">Ordered</option>
//               <option value="owned">Owned</option>
//               <option value="installed">Installed</option>
//             </select>
//           </div>

//           {/* NEW FILTER ROW */}
//           <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
//             <label className="flex items-center gap-2">
//               <input
//                 type="checkbox"
//                 checked={wiresOnly}
//                 onChange={(e) => setWiresOnly(e.target.checked)}
//                 className="h-4 w-4 accent-zinc-200"
//               />
//               Wires only
//             </label>

//             <label className="flex items-center gap-2">
//               <input
//                 type="checkbox"
//                 checked={terminationReadyOnly}
//                 onChange={(e) => setTerminationReadyOnly(e.target.checked)}
//                 className="h-4 w-4 accent-zinc-200"
//               />
//               Termination ready only
//               <span className="text-xs text-zinc-500">(lugs + shrink + connectors)</span>
//             </label>
//           </div>
//         </div>
//       </div>

//       <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
//         <div className="max-h-[72vh] overflow-auto">
//           <table className="min-w-[1500px] w-full border-separate border-spacing-0">
//             <thead className="sticky top-0 z-10 bg-zinc-900">
//               <tr>
//                 {[
//                   ["Name", "w-[280px]"],
//                   ["Category", "w-[180px]"],
//                   ["Vendor", "w-[180px]"],
//                   ["Owned", "w-[120px]"],
//                   ["Need", "w-[120px]"],
//                   ["Status", "w-[160px]"],
//                   ["Lugs", "w-[90px]"],
//                   ["Shrink", "w-[90px]"],
//                   ["Conn", "w-[90px]"],
//                   ["Notes", "w-[360px]"],
//                   ["Actions", "w-[160px]"],
//                 ].map(([label, w]) => (
//                   <th
//                     key={label}
//                     className={cx(
//                       w,
//                       "border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300",
//                     )}
//                   >
//                     {label}
//                   </th>
//                 ))}
//               </tr>
//             </thead>

//             <tbody>
//               {filtered.map((p) => {
//                 const wire = isWirePart(p);
//                 const terminationReady =
//                   wire && p.haveCorrectLugs && p.haveHeatShrink && p.haveConnectors;

//                 return (
//                   <tr key={p.id} className={cx(terminationReady && "bg-emerald-950/20")}>
//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <input
//                         value={p.name || ""}
//                         onChange={(e) => updatePart(p.id, { name: e.target.value })}
//                         className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                       />
//                       {wire && (
//                         <div className="mt-1 text-[11px] text-zinc-500">
//                           {terminationReady ? "✅ Termination ready" : "⚠️ Needs termination items"}
//                         </div>
//                       )}
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <input
//                         value={p.category || ""}
//                         onChange={(e) => updatePart(p.id, { category: e.target.value })}
//                         className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                       />
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <input
//                         value={p.vendor || ""}
//                         onChange={(e) => updatePart(p.id, { vendor: e.target.value })}
//                         className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                       />
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <input
//                         type="number"
//                         value={Number(p.qtyOwned ?? 0)}
//                         onChange={(e) => updatePart(p.id, { qtyOwned: Number(e.target.value) })}
//                         className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                       />
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <input
//                         type="number"
//                         value={Number(p.qtyNeed ?? 0)}
//                         onChange={(e) => updatePart(p.id, { qtyNeed: Number(e.target.value) })}
//                         className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                       />
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <select
//                         value={p.status || "tbd"}
//                         onChange={(e) => updatePart(p.id, { status: e.target.value })}
//                         className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                       >
//                         <option value="tbd">TBD</option>
//                         <option value="needed">Needed</option>
//                         <option value="partial">Partial</option>
//                         <option value="ordered">Ordered</option>
//                         <option value="owned">Owned</option>
//                         <option value="installed">Installed</option>
//                       </select>
//                     </td>

//                     {/* FLAGS */}
//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <button
//                         onClick={() => toggleFlag(p.id, "haveCorrectLugs")}
//                         className={cx(
//                           "w-full rounded-lg border px-2 py-2 text-sm",
//                           p.haveCorrectLugs
//                             ? "border-emerald-500/40 bg-emerald-500/10"
//                             : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60",
//                         )}
//                         title="Have correct lugs for this?"
//                       >
//                         {p.haveCorrectLugs ? "Yes" : "No"}
//                       </button>
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <button
//                         onClick={() => toggleFlag(p.id, "haveHeatShrink")}
//                         className={cx(
//                           "w-full rounded-lg border px-2 py-2 text-sm",
//                           p.haveHeatShrink
//                             ? "border-emerald-500/40 bg-emerald-500/10"
//                             : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60",
//                         )}
//                         title="Have heat shrink for this?"
//                       >
//                         {p.haveHeatShrink ? "Yes" : "No"}
//                       </button>
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <button
//                         onClick={() => toggleFlag(p.id, "haveConnectors")}
//                         className={cx(
//                           "w-full rounded-lg border px-2 py-2 text-sm",
//                           p.haveConnectors
//                             ? "border-emerald-500/40 bg-emerald-500/10"
//                             : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900/60",
//                         )}
//                         title="Have connectors/terminals for this?"
//                       >
//                         {p.haveConnectors ? "Yes" : "No"}
//                       </button>
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <input
//                         value={p.notes || ""}
//                         onChange={(e) => updatePart(p.id, { notes: e.target.value })}
//                         className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                       />
//                     </td>

//                     <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                       <button
//                         onClick={() => deletePart(p.id)}
//                         className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 );
//               })}

//               {filtered.length === 0 && (
//                 <tr>
//                   <td colSpan={11} className="px-3 py-6 text-sm text-zinc-400">
//                     No parts match.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       <p className="text-xs text-zinc-500">
//         Auto-saves via global app state. Use Export Backup for daily snapshots.
//       </p>
//     </div>
//   );
// }
