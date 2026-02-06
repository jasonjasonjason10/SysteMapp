import React, { useEffect, useMemo, useRef, useState } from "react";

const LS_KEY = "van_parts_inventory_v1";

const CATEGORIES = [
  "Batteries",
  "Charge/Invert",
  "Solar",
  "Distribution",
  "Fusing",
  "Wire",
  "Connectors/Lugs",
  "Heatshrink/Loom",
  "Switches/Controls",
  "Monitoring",
  "Mounting/Hardware",
  "Tools",
  "Other",
];

const STATUS = [
  { value: "need_to_buy", label: "Need to buy" },
  { value: "ordered", label: "Ordered" },
  { value: "received", label: "Received" },
  { value: "installed", label: "Installed" },
];

const DEFAULT_PARTS = [
  {
    partId: "P-001",
    name: "Class-T fuse (350A)",
    category: "Fusing",
    brandModel: "TBD",
    qtyNeeded: 1,
    qtyOwned: 1,
    qtyInstalled: 0,
    status: "received",
    usedInCircuits: "HC-001",
    source: "",
    notes: "Fuse shown. Holder not confirmed.",
  },
  {
    partId: "P-002",
    name: "2/0 battery cable (red/black)",
    category: "Wire",
    brandModel: "You own",
    qtyNeeded: 40,
    qtyOwned: 40,
    qtyInstalled: 0,
    status: "received",
    usedInCircuits: "HC-001, HC-002, HC-003",
    source: "",
    notes: "Track actual cut lengths here as you install.",
  },
];

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function uid(prefix = "P") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

export default function PartsInventoryTable() {
  const [parts, setParts] = useState(() => {
    const saved = safeParse(localStorage.getItem(LS_KEY) || "");
    return Array.isArray(saved) ? saved : DEFAULT_PARTS;
  });

  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showMissing, setShowMissing] = useState(false);
  const importRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(parts));
  }, [parts]);

  const stats = useMemo(() => {
    const total = parts.length;
    const needToBuy = parts.filter((p) => p.status === "need_to_buy").length;
    const ordered = parts.filter((p) => p.status === "ordered").length;
    const received = parts.filter((p) => p.status === "received").length;
    const installed = parts.filter((p) => p.status === "installed").length;

    // “missing” means qtyOwned < qtyNeeded
    const missing = parts.filter(
      (p) => Number(p.qtyOwned || 0) < Number(p.qtyNeeded || 0),
    ).length;

    return { total, needToBuy, ordered, received, installed, missing };
  }, [parts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...parts];

    if (catFilter !== "all")
      list = list.filter((p) => p.category === catFilter);
    if (statusFilter !== "all")
      list = list.filter((p) => p.status === statusFilter);

    if (showMissing) {
      list = list.filter(
        (p) => Number(p.qtyOwned || 0) < Number(p.qtyNeeded || 0),
      );
    }

    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.partId,
          p.name,
          p.category,
          p.brandModel,
          p.usedInCircuits,
          p.source,
          p.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    // simple sort: missing first, then name
    list.sort((a, b) => {
      const am = Number(a.qtyOwned || 0) < Number(a.qtyNeeded || 0) ? 0 : 1;
      const bm = Number(b.qtyOwned || 0) < Number(b.qtyNeeded || 0) ? 0 : 1;
      if (am !== bm) return am - bm;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    return list;
  }, [parts, query, catFilter, statusFilter, showMissing]);

  function update(partId, key, value) {
    setParts((prev) =>
      prev.map((p) => (p.partId === partId ? { ...p, [key]: value } : p)),
    );
  }

  function addPart() {
    setParts((prev) => [
      {
        partId: uid("P"),
        name: "",
        category: "Other",
        brandModel: "",
        qtyNeeded: 0,
        qtyOwned: 0,
        qtyInstalled: 0,
        status: "need_to_buy",
        usedInCircuits: "",
        source: "",
        notes: "",
      },
      ...prev,
    ]);
  }

  function duplicate(partId) {
    const found = parts.find((p) => p.partId === partId);
    if (!found) return;
    setParts((prev) => [{ ...found, partId: uid("P") }, ...prev]);
  }

  function remove(partId) {
    setParts((prev) => prev.filter((p) => p.partId !== partId));
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(parts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "parts-inventory.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function onImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = safeParse(String(reader.result || ""));
      if (!Array.isArray(parsed))
        return alert("Import failed: JSON must be an array.");
      setParts(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function reset() {
    if (!confirm("Reset parts inventory? This clears saved edits.")) return;
    localStorage.removeItem(LS_KEY);
    setParts(DEFAULT_PARTS);
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
                Missing <b>{stats.missing}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Need to buy <b>{stats.needToBuy}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Ordered <b>{stats.ordered}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Received <b>{stats.received}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Installed <b>{stats.installed}</b>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={addPart}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
            >
              + Add
            </button>
            <button
              onClick={exportJSON}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
            >
              Export JSON
            </button>
            <button
              onClick={() => importRef.current?.click()}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
            >
              Import JSON
            </button>
            <button
              onClick={reset}
              className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
            >
              Reset
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onImportFile}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parts (fuse, lug, mppt, 2/0, heatshrink...)"
              className="w-full sm:w-[440px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />

            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full sm:w-[220px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
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
                checked={showMissing}
                onChange={(e) => setShowMissing(e.target.checked)}
                className="h-4 w-4 accent-zinc-200"
              />
              Show missing only
            </label>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[1400px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-zinc-900">
              <tr>
                <th className="w-[130px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Part ID
                </th>
                <th className="w-[300px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Name
                </th>
                <th className="w-[220px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Category
                </th>
                <th className="w-[220px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Brand/Model
                </th>
                <th className="w-[120px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Needed
                </th>
                <th className="w-[120px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Owned
                </th>
                <th className="w-[120px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Installed
                </th>
                <th className="w-[180px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Status
                </th>
                <th className="w-[220px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Used in circuits
                </th>
                <th className="w-[260px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Source/Link
                </th>
                <th className="w-[320px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Notes
                </th>
                <th className="w-[240px] border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => {
                const missing =
                  Number(p.qtyOwned || 0) < Number(p.qtyNeeded || 0);
                return (
                  <tr key={p.partId} className={missing ? "bg-red-950/15" : ""}>
                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <input
                        value={p.partId}
                        onChange={(e) =>
                          update(p.partId, "partId", e.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                      />
                    </td>

                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <input
                        value={p.name}
                        onChange={(e) =>
                          update(p.partId, "name", e.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                      />
                    </td>

                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <select
                        value={p.category}
                        onChange={(e) =>
                          update(p.partId, "category", e.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <input
                        value={p.brandModel}
                        onChange={(e) =>
                          update(p.partId, "brandModel", e.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                      />
                    </td>

                    {["qtyNeeded", "qtyOwned", "qtyInstalled"].map((k) => (
                      <td
                        key={k}
                        className="border-b border-zinc-800 px-3 py-2 align-top"
                      >
                        <input
                          value={p[k]}
                          onChange={(e) =>
                            update(
                              p.partId,
                              k,
                              String(e.target.value).replace(/[^\d.]/g, ""),
                            )
                          }
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </td>
                    ))}

                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <select
                        value={p.status}
                        onChange={(e) =>
                          update(p.partId, "status", e.target.value)
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
                        value={p.usedInCircuits}
                        onChange={(e) =>
                          update(p.partId, "usedInCircuits", e.target.value)
                        }
                        placeholder="HC-001, HC-002..."
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                      />
                    </td>

                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <input
                        value={p.source}
                        onChange={(e) =>
                          update(p.partId, "source", e.target.value)
                        }
                        placeholder="Vendor / URL (optional)"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                      />
                    </td>

                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <input
                        value={p.notes}
                        onChange={(e) =>
                          update(p.partId, "notes", e.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                      />
                    </td>

                    <td className="border-b border-zinc-800 px-3 py-2 align-top">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => duplicate(p.partId)}
                          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => remove(p.partId)}
                          className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-6 text-sm text-zinc-400">
                    No parts match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        “Missing” = Owned &lt; Needed (rows tint red). Export JSON for backups.
      </p>
    </div>
  );
}
