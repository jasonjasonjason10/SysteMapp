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
  const hay = [p?.name, p?.category, p?.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const wireHints = [
    "awg",
    "wire",
    "cable",
    "duplex",
    "triplex",
    "welding",
    "pv",
    "mc4",
    "marine",
    "solar",
  ];

  return wireHints.some((h) => hay.includes(h));
}

const WIRE_USE_OPTIONS = [
  "Battery Positive",
  "Battery Negative",
  "DC Distribution",
  "Inverter Feed",
  "Solar PV",
  "Alternator / DC-DC",
  "AC Shore",
  "Fridge",
  "Diesel Heater",
  "Lights",
  "Water Pump",
  "Outlets",
  "Spare / Future",
];

const STATUS_OPTIONS = [
  "tbd",
  "needed",
  "partial",
  "ordered",
  "owned",
  "installed",
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
    ref: typeof part.ref === "string" ? part.ref : "",
    name: typeof part.name === "string" ? part.name : "New Part",
    category: typeof part.category === "string" ? part.category : "",
    vendor: typeof part.vendor === "string" ? part.vendor : "",
    qtyOwned: Number.isFinite(Number(part.qtyOwned)) ? Number(part.qtyOwned) : 0,
    qtyNeed: Number.isFinite(Number(part.qtyNeed)) ? Number(part.qtyNeed) : 0,
    status: STATUS_OPTIONS.includes(part.status) ? part.status : "tbd",
    notes: typeof part.notes === "string" ? part.notes : "",
    haveCorrectLugs: Boolean(part.haveCorrectLugs ?? false),
    haveHeatShrink: Boolean(part.haveHeatShrink ?? false),
    haveConnectors: Boolean(part.haveConnectors ?? false),
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [wiresOnly, setWiresOnly] = useState(false);
  const [terminationReadyOnly, setTerminationReadyOnly] = useState(false);

  const stats = useMemo(() => {
    const total = safeParts.length;
    const wires = safeParts.filter((p) => isWirePart(p)).length;
    const lowStock = safeParts.filter(
      (p) => isWirePart(p) && p.purchasedFeet - p.usedFeet < 5
    ).length;
    const termReady = safeParts.filter(
      (p) =>
        isWirePart(p) &&
        p.haveCorrectLugs &&
        p.haveHeatShrink &&
        p.haveConnectors
    ).length;

    return { total, wires, lowStock, termReady };
  }, [safeParts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...safeParts];

    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (wiresOnly) {
      list = list.filter((p) => isWirePart(p));
    }

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
        [
          p.ref,
          p.name,
          p.category,
          p.vendor,
          p.notes,
          ...(Array.isArray(p.wireUses) ? p.wireUses : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return list;
  }, [safeParts, query, statusFilter, wiresOnly, terminationReadyOnly]);

  function updatePart(id, patch) {
    setParts((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((p) =>
        p.id === id ? { ...normalizePart(p), ...patch } : p
      );
    });
  }

  function addPart() {
    const newPart = normalizePart({
      id: uid("PT"),
      ref: "",
      name: "New Part",
      category: "",
      vendor: "",
      qtyOwned: 0,
      qtyNeed: 0,
      status: "tbd",
      notes: "",
      haveCorrectLugs: false,
      haveHeatShrink: false,
      haveConnectors: false,
      purchasedFeet: 0,
      usedFeet: 0,
      wireUses: [],
    });

    setParts((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return [newPart, ...base];
    });
  }

  function deletePart(id) {
    const ok = confirm("Delete this part?");
    if (!ok) return;

    setParts((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.filter((p) => p.id !== id);
    });
  }

  function toggleWireUse(id, use) {
    const found = safeParts.find((p) => p.id === id);
    if (!found) return;

    const exists = found.wireUses.includes(use);
    const next = exists
      ? found.wireUses.filter((u) => u !== use)
      : [...found.wireUses, use];

    updatePart(id, { wireUses: next });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Parts Inventory</h2>

            <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-300">
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Total <b>{stats.total}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Wires <b>{stats.wires}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Term-ready <b>{stats.termReady}</b>
              </span>
              <span className="rounded-full border border-red-800 bg-red-950/30 px-3 py-1">
                Low Stock (&lt;5ft) <b>{stats.lowStock}</b>
              </span>
            </div>
          </div>

          <button
            onClick={addPart}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
          >
            + Add Part
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search (wire, fuse, lug, victron, solar, heater...)"
              className="w-full sm:w-[520px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-[220px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            >
              <option value="all">All status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wiresOnly}
                onChange={(e) => setWiresOnly(e.target.checked)}
                className="h-4 w-4 accent-zinc-200"
              />
              Wires only
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={terminationReadyOnly}
                onChange={(e) => setTerminationReadyOnly(e.target.checked)}
                className="h-4 w-4 accent-zinc-200"
              />
              Termination ready only
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-auto max-h-[72vh]">
        <table className="min-w-[2300px] w-full">
          <thead className="sticky top-0 bg-zinc-900">
            <tr>
              {[
                "Ref",
                "Name",
                "Category",
                "Vendor",
                "Owned",
                "Need",
                "Status",
                "Purchased ft",
                "Used ft",
                "Remaining",
                "Wire Uses",
                "Lugs",
                "Shrink",
                "Conn",
                "Notes",
                "Actions",
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
              const termReady =
                wire &&
                p.haveCorrectLugs &&
                p.haveHeatShrink &&
                p.haveConnectors;

              return (
                <tr
                  key={p.id}
                  className={cx(
                    lowStock && "bg-red-950/20",
                    termReady && "bg-emerald-950/10"
                  )}
                >
                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      value={p.ref}
                      onChange={(e) => updatePart(p.id, { ref: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      value={p.name}
                      onChange={(e) => updatePart(p.id, { name: e.target.value })}
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      value={p.category}
                      onChange={(e) =>
                        updatePart(p.id, { category: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      value={p.vendor}
                      onChange={(e) =>
                        updatePart(p.id, { vendor: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      type="number"
                      value={p.qtyOwned}
                      onChange={(e) =>
                        updatePart(p.id, { qtyOwned: Number(e.target.value) })
                      }
                      className="w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <input
                      type="number"
                      value={p.qtyNeed}
                      onChange={(e) =>
                        updatePart(p.id, { qtyNeed: Number(e.target.value) })
                      }
                      className="w-20 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <select
                      value={p.status}
                      onChange={(e) =>
                        updatePart(p.id, { status: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire ? (
                      <input
                        type="number"
                        value={p.purchasedFeet}
                        onChange={(e) =>
                          updatePart(p.id, {
                            purchasedFeet: Number(e.target.value),
                          })
                        }
                        className="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                      />
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire ? (
                      <input
                        type="number"
                        value={p.usedFeet}
                        onChange={(e) =>
                          updatePart(p.id, {
                            usedFeet: Number(e.target.value),
                          })
                        }
                        className="w-24 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                      />
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire ? (
                      <span
                        className={cx(
                          "font-semibold",
                          lowStock ? "text-red-400" : "text-emerald-300"
                        )}
                      >
                        {remaining} ft
                      </span>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    {wire ? (
                      <div className="flex flex-wrap gap-2">
                        {WIRE_USE_OPTIONS.map((use) => (
                          <button
                            key={use}
                            onClick={() => toggleWireUse(p.id, use)}
                            className={cx(
                              "rounded border px-2 py-1 text-xs",
                              p.wireUses.includes(use)
                                ? "border-cyan-500/40 bg-cyan-500/20"
                                : "border-zinc-800 bg-zinc-950"
                            )}
                          >
                            {use}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-500">—</span>
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
                        "rounded border px-2 py-1 text-sm",
                        p.haveCorrectLugs
                          ? "border-emerald-500/40 bg-emerald-500/20"
                          : "border-zinc-800 bg-zinc-950"
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
                        "rounded border px-2 py-1 text-sm",
                        p.haveHeatShrink
                          ? "border-emerald-500/40 bg-emerald-500/20"
                          : "border-zinc-800 bg-zinc-950"
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
                        "rounded border px-2 py-1 text-sm",
                        p.haveConnectors
                          ? "border-emerald-500/40 bg-emerald-500/20"
                          : "border-zinc-800 bg-zinc-950"
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
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2">
                    <button
                      onClick={() => deletePart(p.id)}
                      className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={16} className="px-3 py-6 text-sm text-zinc-400">
                  No parts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Remaining wire highlights red if under 5ft.
      </p>
    </div>
  );
}