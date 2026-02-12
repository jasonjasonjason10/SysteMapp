import { useMemo, useState } from "react";

function uid(prefix = "P") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

function cx(...c) {
  return c.filter(Boolean).join(" ");
}

export default function PartsInventoryTable({ parts, setParts }) {
  const safeParts = Array.isArray(parts) ? parts : [];

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const stats = useMemo(() => {
    const total = safeParts.length;
    const owned = safeParts.filter((p) => Number(p.qtyOwned || 0) > 0).length;
    const needed = safeParts.filter((p) => Number(p.qtyNeed || 0) > 0).length;
    return { total, owned, needed };
  }, [safeParts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...safeParts];

    if (status !== "all")
      list = list.filter((p) => (p.status || "tbd") === status);

    if (q) {
      list = list.filter((p) => {
        const hay = [p.name, p.category, p.vendor, p.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [safeParts, query, status]);

  function addPart() {
    const part = {
      id: uid("P"),
      name: "New Part",
      category: "",
      vendor: "",
      qtyOwned: 0,
      qtyNeed: 1,
      status: "tbd", // tbd | ordered | owned | installed
      notes: "",
    };

    setParts((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return [part, ...base];
    });
  }

  function updatePart(id, patch) {
    setParts((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((p) => (p.id === id ? { ...p, ...patch } : p));
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
                Owned <b>{stats.owned}</b>
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                Need <b>{stats.needed}</b>
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

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search (victron, fuse, wire, bus bar...)"
            className="w-full sm:w-[520px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-[220px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
          >
            <option value="all">All status</option>
            <option value="tbd">TBD</option>
            <option value="ordered">Ordered</option>
            <option value="owned">Owned</option>
            <option value="installed">Installed</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[1200px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-zinc-900">
              <tr>
                {[
                  ["Name", "w-[280px]"],
                  ["Category", "w-[180px]"],
                  ["Vendor", "w-[180px]"],
                  ["Owned", "w-[120px]"],
                  ["Need", "w-[120px]"],
                  ["Status", "w-[160px]"],
                  ["Notes", "w-[360px]"],
                  ["Actions", "w-[160px]"],
                ].map(([label, w]) => (
                  <th
                    key={label}
                    className={cx(
                      w,
                      "border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300",
                    )}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={p.name || ""}
                      onChange={(e) =>
                        updatePart(p.id, { name: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={p.category || ""}
                      onChange={(e) =>
                        updatePart(p.id, { category: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={p.vendor || ""}
                      onChange={(e) =>
                        updatePart(p.id, { vendor: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      type="number"
                      value={Number(p.qtyOwned ?? 0)}
                      onChange={(e) =>
                        updatePart(p.id, { qtyOwned: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      type="number"
                      value={Number(p.qtyNeed ?? 0)}
                      onChange={(e) =>
                        updatePart(p.id, { qtyNeed: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <select
                      value={p.status || "tbd"}
                      onChange={(e) =>
                        updatePart(p.id, { status: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    >
                      <option value="tbd">TBD</option>
                      <option value="ordered">Ordered</option>
                      <option value="owned">Owned</option>
                      <option value="installed">Installed</option>
                    </select>
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={p.notes || ""}
                      onChange={(e) =>
                        updatePart(p.id, { notes: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <button
                      onClick={() => deletePart(p.id)}
                      className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-sm text-zinc-400">
                    No parts match.
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
