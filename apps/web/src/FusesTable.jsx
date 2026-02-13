import { useMemo, useState } from "react";

function uid(prefix = "FZ") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

function normalizeFuse(f) {
  const fuse = f && typeof f === "object" ? f : {};
  return {
    id: typeof fuse.id === "string" && fuse.id ? fuse.id : uid("FZ"),
    circuitId: typeof fuse.circuitId === "string" ? fuse.circuitId : "",
    label: typeof fuse.label === "string" ? fuse.label : "New Fuse",
    location: typeof fuse.location === "string" ? fuse.location : "", // e.g. "Lynx Slot 1", "Blue Sea 5026 #3"
    fuseType: typeof fuse.fuseType === "string" ? fuse.fuseType : "", // Class-T / MIDI / ATO / Breaker
    amp: typeof fuse.amp === "string" ? fuse.amp : "", // keep string so "15A" or "7.5A"
    qtyOwned: Number.isFinite(Number(fuse.qtyOwned))
      ? Number(fuse.qtyOwned)
      : 0,
    qtyNeed: Number.isFinite(Number(fuse.qtyNeed)) ? Number(fuse.qtyNeed) : 1,
    // status: typeof fuse.status === "string" ? fuse.status : "tbd", // tbd | needed | ordered | owned | installed
    status:
      fuse.status === "tbd" ||
      fuse.status === "needed" ||
      fuse.status === "ordered" ||
      fuse.status === "owned" ||
      fuse.status === "installed"
        ? fuse.status
        : "tbd",

    notes: typeof fuse.notes === "string" ? fuse.notes : "",
  };
}

export default function FusesTable({ fuses, setFuses }) {
  const safeFuses = useMemo(() => {
    const base = Array.isArray(fuses) ? fuses : [];
    return base.map(normalizeFuse);
  }, [fuses]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = [...safeFuses];

    if (status !== "all")
      list = list.filter((f) => (f.status || "tbd") === status);

    if (q) {
      list = list.filter((f) => {
        const hay = [f.label, f.location, f.fuseType, f.amp, f.notes]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return list;
  }, [safeFuses, query, status]);

  const stats = useMemo(() => {
    const total = safeFuses.length;
    const owned = safeFuses.filter((f) => Number(f.qtyOwned || 0) > 0).length;
    // const needed = safeFuses.filter((f) => Number(f.qtyNeed || 0) > 0).length;
    const needed = safeFuses.filter(
      (f) => Number(f.qtyNeed || 0) > Number(f.qtyOwned || 0),
    ).length;

    return { total, owned, needed };
  }, [safeFuses]);

  function addFuse() {
    const fuse = normalizeFuse({
      id: uid("FZ"),
      label: "New Fuse",
      location: "",
      fuseType: "",
      amp: "",
      qtyOwned: 0,
      qtyNeed: 1,
      status: "tbd",
      notes: "",
    });

    setFuses((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return [fuse, ...base];
    });
  }

  function updateFuse(id, patch) {
    setFuses((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.map((f) =>
        f.id === id ? { ...normalizeFuse(f), ...patch } : f,
      );
    });
  }

  function deleteFuse(id) {
    const ok = confirm("Delete this fuse row?");
    if (!ok) return;
    setFuses((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      return base.filter((f) => f.id !== id);
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Fuses</h2>
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
            onClick={addFuse}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
          >
            + Add Fuse
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search (Lynx, Blue Sea, 15A, MIDI, ATO...)"
            className="w-full sm:w-[520px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full sm:w-[220px] rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
          >
            <option value="all">All status</option>
            <option value="tbd">TBD</option>
            <option value="needed">Needed</option>
            <option value="ordered">Ordered</option>
            <option value="owned">Owned</option>
            <option value="installed">Installed</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[1300px] w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-10 bg-zinc-900">
              <tr>
                {[
                  ["Label", "w-[260px]"],
                  ["Location", "w-[260px]"],
                  ["Type", "w-[160px]"],
                  ["Amps", "w-[120px]"],
                  ["Owned", "w-[120px]"],
                  ["Need", "w-[120px]"],
                  ["Status", "w-[160px]"],
                  ["Notes", "w-[320px]"],
                  ["Actions", "w-[140px]"],
                ].map(([label, w]) => (
                  <th
                    key={label}
                    className={`${w} border-b border-zinc-800 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-300`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((f) => (
                <tr key={f.id}>
                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={f.label}
                      onChange={(e) =>
                        updateFuse(f.id, { label: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={f.location}
                      onChange={(e) =>
                        updateFuse(f.id, { location: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={f.fuseType}
                      onChange={(e) =>
                        updateFuse(f.id, { fuseType: e.target.value })
                      }
                      placeholder="Class-T / MIDI / ATO..."
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={f.amp}
                      onChange={(e) =>
                        updateFuse(f.id, { amp: e.target.value })
                      }
                      placeholder="15A"
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      type="number"
                      value={Number(f.qtyOwned ?? 0)}
                      onChange={(e) =>
                        updateFuse(f.id, { qtyOwned: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      type="number"
                      value={Number(f.qtyNeed ?? 0)}
                      onChange={(e) =>
                        updateFuse(f.id, { qtyNeed: Number(e.target.value) })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <select
                      value={f.status || "tbd"}
                      onChange={(e) =>
                        updateFuse(f.id, { status: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    >
                      <option value="tbd">TBD</option>
                      <option value="needed">Needed</option>
                      <option value="ordered">Ordered</option>
                      <option value="owned">Owned</option>
                      <option value="installed">Installed</option>
                    </select>
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <input
                      value={f.notes || ""}
                      onChange={(e) =>
                        updateFuse(f.id, { notes: e.target.value })
                      }
                      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
                    />
                  </td>

                  <td className="border-b border-zinc-800 px-3 py-2 align-top">
                    <button
                      onClick={() => deleteFuse(f.id)}
                      className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-sm text-zinc-400">
                    No fuses match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        This tab is your fuse map. Later we’ll connect fuses to Wiring Runs by
        circuit ID.
      </p>
    </div>
  );
}
