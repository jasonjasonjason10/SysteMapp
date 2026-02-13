import React, { useMemo, useRef, useState } from "react";

const CONFIDENCE = [
  { value: "confirmed", label: "✅ Confirmed" },
  { value: "needs_confirmation", label: "⚠️ Needs confirm" },
  { value: "tbd", label: "TBD" },
];

const STATUS = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "issue", label: "Issue" },
];

const COLUMNS = [
  { key: "circuitId", label: "Circuit", w: "w-[140px]" },
  { key: "fromTo", label: "From → To", w: "w-[320px]" },
  { key: "wireType", label: "Wire type", w: "w-[180px]" },
  { key: "gaugeOwned", label: "Gauge Required", w: "w-[210px]" },
  { key: "protectionShown", label: "Protection Required", w: "w-[220px]" },

  // ✅ NEW
  { key: "fuseId", label: "Fuse", w: "w-[320px]" },
  { key: "fuseLocation", label: "Fuse Location", w: "w-[260px]" },

  { key: "confidence", label: "✅/⚠️/TBD", w: "w-[180px]" },
  { key: "status", label: "Status", w: "w-[160px]" },
];

function uid(prefix = "HC") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

function fuseDisplay(f) {
  if (!f) return "";
  const bits = [
    f.label || "Fuse",
    f.amp ? `(${f.amp})` : "",
    f.fuseType ? `— ${f.fuseType}` : "",
  ].filter(Boolean);
  return bits.join(" ");
}

export default function WiringRunsTable({ rows, setRows, fuses }) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const safeFuses = Array.isArray(fuses) ? fuses : [];

  const fuseById = useMemo(() => {
    const map = new Map();
    for (const f of safeFuses) {
      if (f?.id) map.set(f.id, f);
    }
    return map;
  }, [safeFuses]);

  const [query, setQuery] = useState("");
  const [confFilter, setConfFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [sortKey, setSortKey] = useState("circuitId");
  const [sortDir, setSortDir] = useState("asc");
  const [expanded, setExpanded] = useState(() => new Set());

  const importRef = useRef(null);

  const stats = useMemo(() => {
    const total = safeRows.length;
    const doneCount = safeRows.filter((r) => r.done).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const issues = safeRows.filter((r) => r.status === "issue").length;
    const needs = safeRows.filter(
      (r) => r.confidence === "needs_confirmation",
    ).length;
    const tbd = safeRows.filter((r) => r.confidence === "tbd").length;
    return { total, doneCount, pct, issues, needs, tbd };
  }, [safeRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...safeRows];

    if (onlyOpen) list = list.filter((r) => !r.done);
    if (confFilter !== "all")
      list = list.filter((r) => r.confidence === confFilter);
    if (statusFilter !== "all")
      list = list.filter((r) => r.status === statusFilter);

    if (q) {
      list = list.filter((r) => {
        const f = r.fuseId ? fuseById.get(r.fuseId) : null;

        const hay = [
          r.circuitId,
          r.fromTo,
          r.wireType,
          r.gaugeOwned,
          r.protectionShown,
          r.notes,

          // ✅ include fuse fields in search
          r.fuseId,
          f?.label,
          f?.amp,
          f?.fuseType,
          f?.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      const av = String(a?.[sortKey] ?? "").toLowerCase();
      const bv = String(b?.[sortKey] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [
    safeRows,
    query,
    confFilter,
    statusFilter,
    onlyOpen,
    sortKey,
    sortDir,
    fuseById,
  ]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function updateRow(circuitId, key, value) {
    setRows((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((r) =>
        r.circuitId === circuitId ? { ...r, [key]: value } : r,
      );
    });
  }

  function addRow() {
    setRows((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return [
        {
          circuitId: uid("HC"),
          fromTo: "",
          wireType: "",
          gaugeOwned: "",
          protectionShown: "",
          fuseId: "", // ✅ NEW
          confidence: "tbd",
          status: "planned",
          done: false,
          notes: "",
        },
        ...base,
      ];
    });
  }

  function duplicateRow(circuitId) {
    const found = safeRows.find((r) => r.circuitId === circuitId);
    if (!found) return;
    setRows((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return [
        { ...found, circuitId: uid("HC"), done: false, status: "planned" },
        ...base,
      ];
    });
  }

  function deleteRow(circuitId) {
    setRows((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.filter((r) => r.circuitId !== circuitId);
    });
    setExpanded((prev) => {
      const n = new Set(prev);
      n.delete(circuitId);
      return n;
    });
  }

  function toggleNotes(circuitId) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(circuitId) ? n.delete(circuitId) : n.add(circuitId);
      return n;
    });
  }

  void importRef;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Wiring Runs</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Total <b>{stats.total}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Done <b>{stats.doneCount}</b> ({stats.pct}%)
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Issues <b>{stats.issues}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                ⚠️ Needs confirm <b>{stats.needs}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                TBD <b>{stats.tbd}</b>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={addRow}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search (battery, lynx, multiplus, fuse, location...)"
              className="w-full sm:w-[440px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />

            <select
              value={confFilter}
              onChange={(e) => setConfFilter(e.target.value)}
              className="w-full sm:w-[200px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            >
              <option value="all">All confidence</option>
              {CONFIDENCE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-[200px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            >
              <option value="all">All status</option>
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="h-4 w-4 accent-zinc-200"
              />
              Only open
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[1850px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-zinc-900">
              <tr>
                <th className="w-[70px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Done
                </th>

                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className={cx(
                      c.w,
                      "border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300 cursor-pointer select-none hover:text-zinc-100",
                    )}
                  >
                    {c.label}
                    <span className="ml-2 text-zinc-500">
                      {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </th>
                ))}

                <th className="w-[260px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => {
                const isIssue = r.status === "issue";
                const isDone = Boolean(r.done);
                const fuse = r.fuseId ? fuseById.get(r.fuseId) : null;

                return (
                  <React.Fragment key={r.circuitId}>
                    <tr
                      className={cx(
                        isDone && "bg-emerald-950/25",
                        isIssue && "bg-red-950/20",
                      )}
                    >
                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={isDone}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateRow(r.circuitId, "done", checked);
                            if (checked)
                              updateRow(r.circuitId, "status", "done");
                            if (!checked && r.status === "done")
                              updateRow(r.circuitId, "status", "planned");
                          }}
                          className="h-4 w-4 accent-zinc-200"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.circuitId}
                          onChange={(e) =>
                            updateRow(r.circuitId, "circuitId", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.fromTo}
                          onChange={(e) =>
                            updateRow(r.circuitId, "fromTo", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.wireType}
                          onChange={(e) =>
                            updateRow(r.circuitId, "wireType", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.gaugeOwned}
                          onChange={(e) =>
                            updateRow(r.circuitId, "gaugeOwned", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.protectionShown}
                          onChange={(e) =>
                            updateRow(
                              r.circuitId,
                              "protectionShown",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      {/* ✅ Fuse dropdown */}
                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <select
                          value={r.fuseId || ""}
                          onChange={(e) =>
                            updateRow(r.circuitId, "fuseId", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        >
                          <option value="">— Select fuse —</option>
                          {safeFuses.map((f) => (
                            <option key={f.id} value={f.id}>
                              {fuseDisplay(f)}{" "}
                              {f.location ? `• ${f.location}` : ""}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* ✅ Read-only location view */}
                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm text-zinc-200">
                          {fuse?.location || (
                            <span className="text-zinc-500">—</span>
                          )}
                        </div>
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <select
                          value={r.confidence}
                          onChange={(e) =>
                            updateRow(r.circuitId, "confidence", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        >
                          {CONFIDENCE.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <select
                          value={r.status}
                          onChange={(e) =>
                            updateRow(r.circuitId, "status", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        >
                          {STATUS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleNotes(r.circuitId)}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                          >
                            {expanded.has(r.circuitId) ? "Hide notes" : "Notes"}
                          </button>
                          <button
                            onClick={() => duplicateRow(r.circuitId)}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => deleteRow(r.circuitId)}
                            className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expanded.has(r.circuitId) && (
                      <tr className="bg-zinc-950/40">
                        <td className="border-b border-zinc-800 px-3 py-2" />
                        <td
                          colSpan={COLUMNS.length + 1}
                          className="border-b border-zinc-800 px-3 py-3"
                        >
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Notes for {r.circuitId}
                            </div>
                            <textarea
                              value={r.notes || ""}
                              onChange={(e) =>
                                updateRow(r.circuitId, "notes", e.target.value)
                              }
                              className="w-full min-h-[96px] resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                              placeholder="Fuse choice, routing plan, install notes, crimp notes, verify max draw, etc."
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 2}
                    className="px-3 py-6 text-sm text-zinc-400"
                  >
                    No rows match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Auto-saves via global app state. Fuses are linked by fuse ID.
      </p>
    </div>
  );
}

// import React, { useMemo, useState } from "react";

// const CONFIDENCE = [
//   { value: "confirmed", label: "✅ Confirmed" },
//   { value: "needs_confirmation", label: "⚠️ Needs confirm" },
//   { value: "tbd", label: "TBD" },
// ];

// const STATUS = [
//   { value: "planned", label: "Planned" },
//   { value: "in_progress", label: "In progress" },
//   { value: "done", label: "Done" },
//   { value: "issue", label: "Issue" },
// ];

// const TYPES = [
//   { value: "DC", label: "DC" },
//   { value: "AC", label: "AC" },
//   { value: "SOL", label: "SOL" },
//   { value: "ALT", label: "ALT" },
// ];

// const COLUMNS = [
//   { key: "label", label: "Circuit", w: "w-[160px]" },
//   { key: "fromTo", label: "From → To", w: "w-[320px]" },
//   { key: "wireType", label: "Wire type", w: "w-[180px]" },
//   { key: "gaugeRequired", label: "Gauge Required", w: "w-[210px]" },
//   { key: "protectionRequired", label: "Protection Required", w: "w-[220px]" },
//   { key: "confidence", label: "✅/⚠️/TBD", w: "w-[180px]" },
//   { key: "status", label: "Status", w: "w-[160px]" },
// ];

// function uid(prefix = "WR") {
//   const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
//   const time = Date.now().toString(16).slice(-4).toUpperCase();
//   return `${prefix}-${time}${rand}`;
// }

// function cx(...c) {
//   return c.filter(Boolean).join(" ");
// }

// function safeParse(json) {
//   try {
//     return JSON.parse(json);
//   } catch {
//     return null;
//   }
// }

// /** label helpers: DC-001, AC-002, SOL-003, ALT-001 */
// function nextLabel(rows, type) {
//   const re = new RegExp(`^${type}-(\\d+)$`, "i");
//   let max = 0;

//   for (const r of rows || []) {
//     const label = String(r?.label || "").trim();
//     const m = label.match(re);
//     if (m) {
//       const n = Number(m[1]);
//       if (Number.isFinite(n)) max = Math.max(max, n);
//     }
//   }

//   const next = String(max + 1).padStart(3, "0");
//   return `${type}-${next}`;
// }

// function normalizeRow(raw, existingForLabel = []) {
//   const r = raw && typeof raw === "object" ? raw : {};

//   // Accept old schema too:
//   // - circuitId was the old visible id; we treat it as label if label is missing.
//   const legacyLabel =
//     typeof r.circuitId === "string" && r.circuitId.trim()
//       ? r.circuitId.trim()
//       : "";

//   const type =
//     r.type === "DC" || r.type === "AC" || r.type === "SOL" || r.type === "ALT"
//       ? r.type
//       : // try infer from label like "DC-001"
//         (() => {
//           const guess = String(r.label || legacyLabel || "").toUpperCase();
//           if (guess.startsWith("DC-")) return "DC";
//           if (guess.startsWith("AC-")) return "AC";
//           if (guess.startsWith("SOL-")) return "SOL";
//           if (guess.startsWith("ALT-")) return "ALT";
//           return "DC";
//         })();

//   const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : uid("WR");

//   const label =
//     (typeof r.label === "string" && r.label.trim() ? r.label.trim() : "") ||
//     legacyLabel ||
//     nextLabel(existingForLabel, type);

//   const confidence =
//     r.confidence === "confirmed" ||
//     r.confidence === "needs_confirmation" ||
//     r.confidence === "tbd"
//       ? r.confidence
//       : "tbd";

//   const status =
//     r.status === "planned" ||
//     r.status === "in_progress" ||
//     r.status === "done" ||
//     r.status === "issue"
//       ? r.status
//       : "planned";

//   const done = Boolean(r.done || status === "done");

//   return {
//     id,
//     type,
//     label,
//     fromTo: typeof r.fromTo === "string" ? r.fromTo : "",
//     wireType: typeof r.wireType === "string" ? r.wireType : "",
//     gaugeRequired:
//       typeof r.gaugeRequired === "string"
//         ? r.gaugeRequired
//         : typeof r.gaugeOwned === "string"
//           ? r.gaugeOwned
//           : "",
//     protectionRequired:
//       typeof r.protectionRequired === "string"
//         ? r.protectionRequired
//         : typeof r.protectionShown === "string"
//           ? r.protectionShown
//           : "",
//     confidence,
//     status,
//     done,
//     notes: typeof r.notes === "string" ? r.notes : "",
//   };
// }

// function normalizeRows(input) {
//   const base = Array.isArray(input) ? input : [];
//   const out = [];
//   for (const raw of base) out.push(normalizeRow(raw, out));
//   return out;
// }

// function dedupeById(items) {
//   const seen = new Set();
//   const out = [];
//   for (const it of items) {
//     const id = it?.id;
//     if (!id) continue;
//     if (seen.has(id)) continue;
//     seen.add(id);
//     out.push(it);
//   }
//   return out;
// }

// function ensureUniqueLabels(items) {
//   const seen = new Set();
//   const out = [];

//   for (const r of items) {
//     let label = String(r?.label || "").trim();
//     if (!label) label = nextLabel(out, r.type || "DC");

//     if (seen.has(label)) {
//       label = nextLabel(out, r.type || "DC");
//     }
//     seen.add(label);
//     out.push({ ...r, label });
//   }

//   return out;
// }

// function extractRowsFromImport(parsed) {
//   if (Array.isArray(parsed)) return parsed;
//   if (parsed && typeof parsed === "object") {
//     const candidates = [
//       parsed.rows,
//       parsed.wiringRuns,
//       parsed.runs,
//       parsed.data?.rows,
//       parsed.data?.wiringRuns,
//       parsed.ops?.wiringRuns,
//     ];
//     for (const c of candidates) {
//       if (Array.isArray(c)) return c;
//     }
//   }
//   return null;
// }

// export default function WiringRunsTable({ rows, setRows }) {
//   const safeRows = useMemo(() => normalizeRows(rows), [rows]);

//   const [query, setQuery] = useState("");
//   const [confFilter, setConfFilter] = useState("all");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [typeFilter, setTypeFilter] = useState("all");
//   const [onlyOpen, setOnlyOpen] = useState(false);

//   const [sortKey, setSortKey] = useState("label");
//   const [sortDir, setSortDir] = useState("asc");
//   const [expanded, setExpanded] = useState(() => new Set());

//   // Import modal state
//   const [importOpen, setImportOpen] = useState(false);
//   const [importText, setImportText] = useState("");
//   const [importErr, setImportErr] = useState("");
//   const [importInfo, setImportInfo] = useState(null); // { rowsCount }

//   const stats = useMemo(() => {
//     const total = safeRows.length;
//     const doneCount = safeRows.filter((r) => r.done).length;
//     const pct = total ? Math.round((doneCount / total) * 100) : 0;
//     const issues = safeRows.filter((r) => r.status === "issue").length;
//     const needs = safeRows.filter(
//       (r) => r.confidence === "needs_confirmation",
//     ).length;
//     const tbd = safeRows.filter((r) => r.confidence === "tbd").length;
//     return { total, doneCount, pct, issues, needs, tbd };
//   }, [safeRows]);

//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     let list = [...safeRows];

//     if (onlyOpen) list = list.filter((r) => !r.done);
//     if (confFilter !== "all")
//       list = list.filter((r) => r.confidence === confFilter);
//     if (statusFilter !== "all")
//       list = list.filter((r) => r.status === statusFilter);
//     if (typeFilter !== "all") list = list.filter((r) => r.type === typeFilter);

//     if (q) {
//       list = list.filter((r) => {
//         const hay = [
//           r.label,
//           r.type,
//           r.fromTo,
//           r.wireType,
//           r.gaugeRequired,
//           r.protectionRequired,
//           r.notes,
//         ]
//           .filter(Boolean)
//           .join(" ")
//           .toLowerCase();
//         return hay.includes(q);
//       });
//     }

//     list.sort((a, b) => {
//       const av = String(a?.[sortKey] ?? "").toLowerCase();
//       const bv = String(b?.[sortKey] ?? "").toLowerCase();
//       if (av < bv) return sortDir === "asc" ? -1 : 1;
//       if (av > bv) return sortDir === "asc" ? 1 : -1;
//       return 0;
//     });

//     return list;
//   }, [
//     safeRows,
//     query,
//     confFilter,
//     statusFilter,
//     typeFilter,
//     onlyOpen,
//     sortKey,
//     sortDir,
//   ]);

//   function toggleSort(key) {
//     if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     else {
//       setSortKey(key);
//       setSortDir("asc");
//     }
//   }

//   function updateRow(id, patch) {
//     setRows((prev) => {
//       const base = normalizeRows(prev);
//       const next = base.map((r) => (r.id === id ? { ...r, ...patch } : r));
//       return ensureUniqueLabels(next);
//     });
//   }

//   function addRow() {
//     setRows((prev) => {
//       const base = normalizeRows(prev);
//       const type = "DC";
//       const row = normalizeRow(
//         {
//           id: uid("WR"),
//           type,
//           label: nextLabel(base, type),
//           fromTo: "",
//           wireType: "",
//           gaugeRequired: "",
//           protectionRequired: "",
//           confidence: "tbd",
//           status: "planned",
//           done: false,
//           notes: "",
//         },
//         base,
//       );
//       return [row, ...base];
//     });
//   }

//   function duplicateRow(id) {
//     const found = safeRows.find((r) => r.id === id);
//     if (!found) return;

//     setRows((prev) => {
//       const base = normalizeRows(prev);
//       const type = found.type || "DC";
//       const copy = normalizeRow(
//         {
//           ...found,
//           id: uid("WR"),
//           label: nextLabel(base, type),
//           done: false,
//           status: "planned",
//         },
//         base,
//       );
//       return [copy, ...base];
//     });
//   }

//   function deleteRow(id) {
//     setRows((prev) => normalizeRows(prev).filter((r) => r.id !== id));
//     setExpanded((prev) => {
//       const n = new Set(prev);
//       n.delete(id);
//       return n;
//     });
//   }

//   function toggleNotes(id) {
//     setExpanded((prev) => {
//       const n = new Set(prev);
//       n.has(id) ? n.delete(id) : n.add(id);
//       return n;
//     });
//   }

//   function openImport() {
//     setImportErr("");
//     setImportInfo(null);
//     setImportText("");
//     setImportOpen(true);
//   }

//   function closeImport() {
//     setImportOpen(false);
//   }

//   function validateImportText(text) {
//     const parsed = safeParse(text);
//     if (!parsed)
//       return {
//         ok: false,
//         error: "Invalid JSON. Make sure it’s valid JSON text.",
//       };

//     const extracted = extractRowsFromImport(parsed);
//     if (!extracted) {
//       return {
//         ok: false,
//         error:
//           "Import failed: JSON must be an array of wiring runs, or an object containing a rows array (rows / wiringRuns).",
//       };
//     }

//     const incoming = normalizeRows(extracted);
//     return { ok: true, incoming, rowsCount: incoming.length };
//   }

//   function runValidate() {
//     const res = validateImportText(importText);
//     if (!res.ok) {
//       setImportErr(res.error);
//       setImportInfo(null);
//       return;
//     }
//     setImportErr("");
//     setImportInfo({ rowsCount: res.rowsCount });
//   }

//   function runImport() {
//     const res = validateImportText(importText);
//     if (!res.ok) {
//       setImportErr(res.error);
//       setImportInfo(null);
//       return;
//     }

//     const incoming = res.incoming;

//     setRows((prev) => {
//       const base = normalizeRows(prev);
//       let merged = [...incoming, ...base];
//       merged = dedupeById(merged);
//       merged = ensureUniqueLabels(merged);
//       return merged;
//     });

//     setImportOpen(false);
//   }

//   return (
//     <div className="space-y-4">
//       <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
//         <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//           <div>
//             <h2 className="text-lg font-semibold">Wiring Runs</h2>
//             <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Total <b>{stats.total}</b>
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Done <b>{stats.doneCount}</b> ({stats.pct}%)
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 Issues <b>{stats.issues}</b>
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 ⚠️ Needs confirm <b>{stats.needs}</b>
//               </span>
//               <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
//                 TBD <b>{stats.tbd}</b>
//               </span>
//             </div>
//           </div>

//           <div className="flex flex-wrap gap-2">
//             <button
//               onClick={openImport}
//               className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
//             >
//               Import
//             </button>

//             <button
//               onClick={addRow}
//               className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
//             >
//               + Add
//             </button>
//           </div>
//         </div>

//         <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//           <div className="flex flex-wrap items-center gap-2 min-w-0">

//             <input
//               value={query}
//               onChange={(e) => setQuery(e.target.value)}
//               placeholder="Search (battery, lynx, multiplus, gauge, fuse...)"
//               className="w-full sm:w-[420px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
//             />

//             <select
//               value={typeFilter}
//               onChange={(e) => setTypeFilter(e.target.value)}
//               className="w-full sm:w-[160px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
//             >
//               <option value="all">All types</option>
//               {TYPES.map((t) => (
//                 <option key={t.value} value={t.value}>
//                   {t.label}
//                 </option>
//               ))}
//             </select>

//             <select
//               value={confFilter}
//               onChange={(e) => setConfFilter(e.target.value)}
//               className="w-full sm:w-[200px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
//             >
//               <option value="all">All confidence</option>
//               {CONFIDENCE.map((c) => (
//                 <option key={c.value} value={c.value}>
//                   {c.label}
//                 </option>
//               ))}
//             </select>

//             <select
//               value={statusFilter}
//               onChange={(e) => setStatusFilter(e.target.value)}
//               className="w-full sm:w-[200px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
//             >
//               <option value="all">All status</option>
//               {STATUS.map((s) => (
//                 <option key={s.value} value={s.value}>
//                   {s.label}
//                 </option>
//               ))}
//             </select>

//             <label className="flex items-center gap-2 text-sm text-zinc-300">
//               <input
//                 type="checkbox"
//                 checked={onlyOpen}
//                 onChange={(e) => setOnlyOpen(e.target.checked)}
//                 className="h-4 w-4 accent-zinc-200"
//               />
//               Only open
//             </label>
//           </div>
//         </div>
//       </div>

//       <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
//         <div className="max-h-[72vh] overflow-auto">
//           <table className="min-w-[1500px] w-full border-separate border-spacing-0">
//             <thead className="sticky top-0 z-10 bg-zinc-900">
//               <tr>
//                 <th className="w-[70px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
//                   Done
//                 </th>
//                 {COLUMNS.map((c) => (
//                   <th
//                     key={c.key}
//                     onClick={() => toggleSort(c.key)}
//                     className={cx(
//                       c.w,
//                       "border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300 cursor-pointer select-none hover:text-zinc-100",
//                     )}
//                   >
//                     {c.label}
//                     <span className="ml-2 text-zinc-500">
//                       {sortKey === c.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
//                     </span>
//                   </th>
//                 ))}
//                 <th className="w-[280px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
//                   Actions
//                 </th>
//               </tr>
//             </thead>

//             <tbody>
//               {filtered.map((r) => {
//                 const isIssue = r.status === "issue";
//                 const isDone = Boolean(r.done);

//                 return (
//                   <React.Fragment key={r.id}>
//                     <tr
//                       className={cx(
//                         isDone && "bg-emerald-950/25",
//                         isIssue && "bg-red-950/20",
//                       )}
//                     >
//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <input
//                           type="checkbox"
//                           checked={isDone}
//                           onChange={(e) => {
//                             const checked = e.target.checked;
//                             updateRow(r.id, { done: checked });
//                             if (checked) updateRow(r.id, { status: "done" });
//                             if (!checked && r.status === "done")
//                               updateRow(r.id, { status: "planned" });
//                           }}
//                           className="h-4 w-4 accent-zinc-200"
//                         />
//                       </td>

//                       {/* Circuit: TYPE + label */}
//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <div className="grid grid-cols-[90px_1fr] gap-2">
//                           <select
//                             value={r.type}
//                             onChange={(e) => {
//                               const nextType = e.target.value;
//                               updateRow(r.id, {
//                                 type: nextType,
//                                 label: nextLabel(safeRows, nextType),
//                               });
//                             }}
//                             className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                           >
//                             {TYPES.map((t) => (
//                               <option key={t.value} value={t.value}>
//                                 {t.label}
//                               </option>
//                             ))}
//                           </select>

//                           <input
//                             value={r.label}
//                             onChange={(e) =>
//                               updateRow(r.id, { label: e.target.value })
//                             }
//                             className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                           />
//                         </div>
//                         <div className="mt-1 text-[11px] text-zinc-500">
//                           Label this on both wire ends.
//                         </div>
//                       </td>

//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <input
//                           value={r.fromTo}
//                           onChange={(e) =>
//                             updateRow(r.id, { fromTo: e.target.value })
//                           }
//                           className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                         />
//                       </td>

//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <input
//                           value={r.wireType}
//                           onChange={(e) =>
//                             updateRow(r.id, { wireType: e.target.value })
//                           }
//                           className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                         />
//                       </td>

//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <input
//                           value={r.gaugeRequired}
//                           onChange={(e) =>
//                             updateRow(r.id, { gaugeRequired: e.target.value })
//                           }
//                           className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                         />
//                       </td>

//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <input
//                           value={r.protectionRequired}
//                           onChange={(e) =>
//                             updateRow(r.id, {
//                               protectionRequired: e.target.value,
//                             })
//                           }
//                           className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                         />
//                       </td>

//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <select
//                           value={r.confidence}
//                           onChange={(e) =>
//                             updateRow(r.id, { confidence: e.target.value })
//                           }
//                           className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                         >
//                           {CONFIDENCE.map((c) => (
//                             <option key={c.value} value={c.value}>
//                               {c.label}
//                             </option>
//                           ))}
//                         </select>
//                       </td>

//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <select
//                           value={r.status}
//                           onChange={(e) =>
//                             updateRow(r.id, { status: e.target.value })
//                           }
//                           className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
//                         >
//                           {STATUS.map((s) => (
//                             <option key={s.value} value={s.value}>
//                               {s.label}
//                             </option>
//                           ))}
//                         </select>
//                       </td>

//                       <td className="border-b border-zinc-800 px-3 py-2 align-top">
//                         <div className="flex flex-wrap gap-2">
//                           <button
//                             onClick={() => toggleNotes(r.id)}
//                             className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
//                           >
//                             {expanded.has(r.id) ? "Hide notes" : "Notes"}
//                           </button>

//                           <button
//                             onClick={() => duplicateRow(r.id)}
//                             className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
//                           >
//                             Duplicate
//                           </button>

//                           <button
//                             onClick={() => deleteRow(r.id)}
//                             className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
//                           >
//                             Delete
//                           </button>
//                         </div>
//                       </td>
//                     </tr>

//                     {expanded.has(r.id) && (
//                       <tr className="bg-zinc-950/40">
//                         <td className="border-b border-zinc-800 px-3 py-2" />
//                         <td
//                           colSpan={COLUMNS.length + 1}
//                           className="border-b border-zinc-800 px-3 py-3"
//                         >
//                           <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
//                             <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
//                               Notes for {r.label}
//                             </div>
//                             <textarea
//                               value={r.notes || ""}
//                               onChange={(e) =>
//                                 updateRow(r.id, { notes: e.target.value })
//                               }
//                               className="w-full min-h-[96px] resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
//                               placeholder="Fuse choice, routing plan, install notes, crimp notes, verify max draw, etc."
//                             />
//                           </div>
//                         </td>
//                       </tr>
//                     )}
//                   </React.Fragment>
//                 );
//               })}

//               {filtered.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan={COLUMNS.length + 2}
//                     className="px-3 py-6 text-sm text-zinc-400"
//                   >
//                     No rows match.
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

//       {/* Import Modal */}
//       {importOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
//           <div className="absolute inset-0 bg-black/70" onClick={closeImport} />
//           <div className="relative w-full max-w-3xl">
//             <div className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
//               <div className="flex items-start justify-between gap-4">
//                 <div>
//                   <div className="text-lg font-semibold">
//                     Import Wiring Runs
//                   </div>
//                   <div className="mt-1 text-xs text-zinc-400">
//                     Paste a JSON array of runs (or an object containing rows /
//                     wiringRuns).
//                   </div>
//                 </div>

//                 <button
//                   onClick={closeImport}
//                   className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900/70"
//                 >
//                   Close
//                 </button>
//               </div>

//               <div className="mt-4">
//                 <textarea
//                   value={importText}
//                   onChange={(e) => setImportText(e.target.value)}
//                   placeholder='Paste JSON here (example: [{"type":"DC","label":"DC-001","fromTo":"Battery → Lynx","wireType":"2/0","gaugeRequired":"2/0","protectionRequired":"350A Class-T"}])'
//                   className="w-full min-h-[260px] resize-y rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed outline-none focus:border-zinc-600"
//                 />

//                 <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//                   <div className="min-h-[20px] text-xs">
//                     {importErr ? (
//                       <span className="text-red-300">{importErr}</span>
//                     ) : importInfo ? (
//                       <span className="text-zinc-300">
//                         Looks good: <b>{importInfo.rowsCount}</b> runs.
//                       </span>
//                     ) : (
//                       <span className="text-zinc-500">
//                         Tip: Click “Validate” to preview counts before
//                         importing.
//                       </span>
//                     )}
//                   </div>

//                   <div className="flex gap-2">
//                     <button
//                       onClick={() => {
//                         navigator.clipboard
//                           ?.readText?.()
//                           .then((t) => setImportText(t || ""))
//                           .catch(() => {});
//                       }}
//                       className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
//                       title="Paste from clipboard (may require permission)"
//                     >
//                       Paste
//                     </button>

//                     <button
//                       onClick={runValidate}
//                       className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
//                     >
//                       Validate
//                     </button>

//                     <button
//                       onClick={runImport}
//                       className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm hover:bg-cyan-500/20"
//                     >
//                       Import
//                     </button>
//                   </div>
//                 </div>

//                 <div className="mt-3 text-[11px] text-zinc-500">
//                   Safe behavior: bad JSON won’t import. Missing ids/labels get
//                   auto-filled. Label collisions are auto-resolved.
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
