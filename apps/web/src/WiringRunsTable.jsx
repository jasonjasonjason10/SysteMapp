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
  { key: "label", label: "Circuit", w: "w-[140px]" },
  { key: "fromTo", label: "From → To", w: "w-[320px]" },
  { key: "wireType", label: "Wire type", w: "w-[180px]" },
  { key: "gaugeRequired", label: "Gauge Required", w: "w-[170px]" },
  { key: "lengthPlannedFt", label: "Planned Ft", w: "w-[120px]" },
  { key: "lengthActualFt", label: "Actual Ft", w: "w-[120px]" },
  { key: "connectorFrom", label: "From Conn", w: "w-[160px]" },
  { key: "connectorTo", label: "To Conn", w: "w-[160px]" },
  { key: "lugSizeFrom", label: "From Lug", w: "w-[140px]" },
  { key: "lugSizeTo", label: "To Lug", w: "w-[140px]" },
  { key: "protectionRequired", label: "Protection Required", w: "w-[220px]" },
  { key: "fuseId", label: "Fuse", w: "w-[260px]" },
  { key: "fuseLocation", label: "Fuse Location", w: "w-[220px]" },
  { key: "confidence", label: "✅/⚠️/TBD", w: "w-[180px]" },
  { key: "status", label: "Status", w: "w-[160px]" },
  { key: "tested", label: "Tested", w: "w-[100px]" },
];

function uid(prefix = "WR") {
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

function normalizeRow(r) {
  const row = r && typeof r === "object" ? r : {};

  const label =
    typeof row.label === "string" && row.label.trim()
      ? row.label.trim()
      : typeof row.circuitId === "string" && row.circuitId.trim()
        ? row.circuitId.trim()
        : uid("WR");

  const gaugeRequired =
    typeof row.gaugeRequired === "string"
      ? row.gaugeRequired
      : typeof row.gaugeOwned === "string"
        ? row.gaugeOwned
        : "";

  const protectionRequired =
    typeof row.protectionRequired === "string"
      ? row.protectionRequired
      : typeof row.protectionShown === "string"
        ? row.protectionShown
        : "";

  const confidence =
    row.confidence === "confirmed" ||
    row.confidence === "needs_confirmation" ||
    row.confidence === "tbd"
      ? row.confidence
      : "tbd";

  const status =
    row.status === "planned" ||
    row.status === "in_progress" ||
    row.status === "done" ||
    row.status === "issue"
      ? row.status
      : "planned";

  return {
    ...row,
    id: typeof row.id === "string" && row.id ? row.id : uid("WR"),
    label,
    circuitId: label,
    fromTo: typeof row.fromTo === "string" ? row.fromTo : "",
    wireType: typeof row.wireType === "string" ? row.wireType : "",
    gaugeRequired,
    gaugeOwned: gaugeRequired,
    lengthPlannedFt:
      row.lengthPlannedFt !== undefined && row.lengthPlannedFt !== null
        ? String(row.lengthPlannedFt)
        : "",
    lengthActualFt:
      row.lengthActualFt !== undefined && row.lengthActualFt !== null
        ? String(row.lengthActualFt)
        : "",
    connectorFrom:
      typeof row.connectorFrom === "string" ? row.connectorFrom : "",
    connectorTo: typeof row.connectorTo === "string" ? row.connectorTo : "",
    lugSizeFrom: typeof row.lugSizeFrom === "string" ? row.lugSizeFrom : "",
    lugSizeTo: typeof row.lugSizeTo === "string" ? row.lugSizeTo : "",
    protectionRequired,
    protectionShown: protectionRequired,
    fuseId: typeof row.fuseId === "string" ? row.fuseId : "",
    confidence,
    status,
    done: Boolean(row.done || status === "done"),
    tested: Boolean(row.tested),
    notes: typeof row.notes === "string" ? row.notes : "",
  };
}

export default function WiringRunsTable({ rows, setRows, fuses }) {
  const safeRows = useMemo(() => {
    const base = Array.isArray(rows) ? rows : [];
    return base.map(normalizeRow);
  }, [rows]);

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

  const [sortKey, setSortKey] = useState("label");
  const [sortDir, setSortDir] = useState("asc");
  const [expanded, setExpanded] = useState(() => new Set());

  const importRef = useRef(null);
  void importRef;

  const stats = useMemo(() => {
    const total = safeRows.length;
    const doneCount = safeRows.filter((r) => r.done).length;
    const testedCount = safeRows.filter((r) => r.tested).length;
    const pct = total ? Math.round((doneCount / total) * 100) : 0;
    const issues = safeRows.filter((r) => r.status === "issue").length;
    const needs = safeRows.filter(
      (r) => r.confidence === "needs_confirmation",
    ).length;
    const tbd = safeRows.filter((r) => r.confidence === "tbd").length;
    return { total, doneCount, testedCount, pct, issues, needs, tbd };
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
          r.label,
          r.fromTo,
          r.wireType,
          r.gaugeRequired,
          r.lengthPlannedFt,
          r.lengthActualFt,
          r.connectorFrom,
          r.connectorTo,
          r.lugSizeFrom,
          r.lugSizeTo,
          r.protectionRequired,
          r.notes,
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

  function updateRow(label, key, value) {
    setRows((prev) => {
      const base = Array.isArray(prev) ? prev.map(normalizeRow) : [];
      return base.map((r) =>
        r.label === label
          ? {
              ...r,
              [key]: value,
              ...(key === "label" ? { circuitId: value } : {}),
              ...(key === "gaugeRequired" ? { gaugeOwned: value } : {}),
              ...(key === "protectionRequired"
                ? { protectionShown: value }
                : {}),
            }
          : r,
      );
    });
  }

  function addRow() {
    setRows((prev) => {
      const base = Array.isArray(prev) ? prev.map(normalizeRow) : [];
      return [
        {
          id: uid("WR"),
          label: uid("WR"),
          circuitId: "",
          fromTo: "",
          wireType: "",
          gaugeRequired: "",
          gaugeOwned: "",
          lengthPlannedFt: "",
          lengthActualFt: "",
          connectorFrom: "",
          connectorTo: "",
          lugSizeFrom: "",
          lugSizeTo: "",
          protectionRequired: "",
          protectionShown: "",
          fuseId: "",
          confidence: "tbd",
          status: "planned",
          done: false,
          tested: false,
          notes: "",
        },
        ...base,
      ];
    });
  }

  function duplicateRow(label) {
    const found = safeRows.find((r) => r.label === label);
    if (!found) return;

    setRows((prev) => {
      const base = Array.isArray(prev) ? prev.map(normalizeRow) : [];
      return [
        {
          ...found,
          id: uid("WR"),
          label: uid("WR"),
          circuitId: "",
          done: false,
          tested: false,
          status: "planned",
        },
        ...base,
      ];
    });
  }

  function deleteRow(label) {
    setRows((prev) => {
      const base = Array.isArray(prev) ? prev.map(normalizeRow) : [];
      return base.filter((r) => r.label !== label);
    });

    setExpanded((prev) => {
      const n = new Set(prev);
      n.delete(label);
      return n;
    });
  }

  function toggleNotes(label) {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(label) ? n.delete(label) : n.add(label);
      return n;
    });
  }

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
                Tested <b>{stats.testedCount}</b>
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
              placeholder="Search (battery, lynx, multiplus, lug, connector, fuse...)"
              className="w-full sm:w-[500px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
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
          <table className="min-w-[2750px] w-full border-separate border-spacing-0">
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
                  <React.Fragment key={r.id}>
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
                            updateRow(r.label, "done", checked);
                            if (checked) updateRow(r.label, "status", "done");
                            if (!checked && r.status === "done") {
                              updateRow(r.label, "status", "planned");
                              updateRow(r.label, "tested", false);
                            }
                          }}
                          className="h-4 w-4 accent-zinc-200"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.label}
                          onChange={(e) =>
                            updateRow(r.label, "label", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.fromTo}
                          onChange={(e) =>
                            updateRow(r.label, "fromTo", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.wireType}
                          onChange={(e) =>
                            updateRow(r.label, "wireType", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.gaugeRequired}
                          onChange={(e) =>
                            updateRow(r.label, "gaugeRequired", e.target.value)
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.lengthPlannedFt}
                          onChange={(e) =>
                            updateRow(
                              r.label,
                              "lengthPlannedFt",
                              e.target.value,
                            )
                          }
                          placeholder="3.5"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.lengthActualFt}
                          onChange={(e) =>
                            updateRow(r.label, "lengthActualFt", e.target.value)
                          }
                          placeholder="3.8"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.connectorFrom}
                          onChange={(e) =>
                            updateRow(r.label, "connectorFrom", e.target.value)
                          }
                          placeholder="lug / ferrule / MC4"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.connectorTo}
                          onChange={(e) =>
                            updateRow(r.label, "connectorTo", e.target.value)
                          }
                          placeholder="lug / ferrule / MC4"
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.lugSizeFrom}
                          onChange={(e) =>
                            updateRow(r.label, "lugSizeFrom", e.target.value)
                          }
                          placeholder='5/16"'
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.lugSizeTo}
                          onChange={(e) =>
                            updateRow(r.label, "lugSizeTo", e.target.value)
                          }
                          placeholder='3/8"'
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <input
                          value={r.protectionRequired}
                          onChange={(e) =>
                            updateRow(
                              r.label,
                              "protectionRequired",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <select
                          value={r.fuseId || ""}
                          onChange={(e) =>
                            updateRow(r.label, "fuseId", e.target.value)
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
                            updateRow(r.label, "confidence", e.target.value)
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
                            updateRow(r.label, "status", e.target.value)
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
                        <input
                          type="checkbox"
                          checked={Boolean(r.tested)}
                          onChange={(e) =>
                            updateRow(r.label, "tested", e.target.checked)
                          }
                          className="h-4 w-4 accent-zinc-200"
                        />
                      </td>

                      <td className="border-b border-zinc-800 px-3 py-2 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => toggleNotes(r.label)}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                          >
                            {expanded.has(r.label) ? "Hide notes" : "Notes"}
                          </button>
                          <button
                            onClick={() => duplicateRow(r.label)}
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                          >
                            Duplicate
                          </button>
                          <button
                            onClick={() => deleteRow(r.label)}
                            className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expanded.has(r.label) && (
                      <tr className="bg-zinc-950/40">
                        <td className="border-b border-zinc-800 px-3 py-2" />
                        <td
                          colSpan={COLUMNS.length + 1}
                          className="border-b border-zinc-800 px-3 py-3"
                        >
                          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                              Notes for {r.label}
                            </div>
                            <textarea
                              value={r.notes || ""}
                              onChange={(e) =>
                                updateRow(r.label, "notes", e.target.value)
                              }
                              className="w-full min-h-[96px] resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                              placeholder="Routing notes, crimp notes, exact stud size, meter test result, install notes, etc."
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
