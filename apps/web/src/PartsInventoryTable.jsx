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
  { key: "gaugeOwned", label: "Gauge you own", w: "w-[210px]" },
  { key: "protectionShown", label: "Protection shown", w: "w-[220px]" },
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

export default function WiringRunsTable({ rows, setRows }) {
  const [query, setQuery] = useState("");
  const [confFilter, setConfFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [onlyOpen, setOnlyOpen] = useState(false);

  const [sortKey, setSortKey] = useState("circuitId");
  const [sortDir, setSortDir] = useState("asc");
  const [expanded, setExpanded] = useState(() => new Set());

  const importRef = useRef(null);

  const stats = useMemo(() => {
    const total = rows.length;
    const doneCount = rows.filter((r) => r.done).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const issues = rows.filter((r) => r.status === "issue").length;
    const needs = rows.filter(
      (r) => r.confidence === "needs_confirmation",
    ).length;
    const tbd = rows.filter((r) => r.confidence === "tbd").length;
    return { total, doneCount, pct, issues, needs, tbd };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...rows];

    if (onlyOpen) list = list.filter((r) => !r.done);
    if (confFilter !== "all")
      list = list.filter((r) => r.confidence === confFilter);
    if (statusFilter !== "all")
      list = list.filter((r) => r.status === statusFilter);

    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.circuitId,
          r.fromTo,
          r.wireType,
          r.gaugeOwned,
          r.protectionShown,
          r.notes,
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
  }, [rows, query, confFilter, statusFilter, onlyOpen, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function updateRow(circuitId, key, value) {
    setRows((prev) =>
      prev.map((r) => (r.circuitId === circuitId ? { ...r, [key]: value } : r)),
    );
  }

  function addRow() {
    setRows((prev) => [
      {
        circuitId: uid("HC"),
        fromTo: "",
        wireType: "",
        gaugeOwned: "",
        protectionShown: "",
        confidence: "tbd",
        status: "planned",
        done: false,
        notes: "",
      },
      ...prev,
    ]);
  }

  function duplicateRow(circuitId) {
    const found = rows.find((r) => r.circuitId === circuitId);
    if (!found) return;
    setRows((prev) => [
      { ...found, circuitId: uid("HC"), done: false, status: "planned" },
      ...prev,
    ]);
  }

  function deleteRow(circuitId) {
    setRows((prev) => prev.filter((r) => r.circuitId !== circuitId));
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

  // Local import/export buttons removed (global backup now), but we’ll keep a simple “paste import” later if you want.
  // Leaving this hidden ref to show we can add per-module import later if needed.
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
              placeholder="Search (battery, lynx, multiplus, gauge, fuse...)"
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
          <table className="min-w-[1400px] w-full border-separate border-spacing-0">
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
        Auto-saves via global app state. Use Export Backup for daily snapshots.
      </p>
    </div>
  );
}
