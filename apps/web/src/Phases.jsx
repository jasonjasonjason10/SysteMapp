import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

function uid(prefix = "PH") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeTask(t) {
  const task = t && typeof t === "object" ? t : {};
  return {
    id: typeof task.id === "string" && task.id ? task.id : uid("T"),
    title: typeof task.title === "string" ? task.title : "Untitled Task",
    status:
      task.status === "not_started" ||
      task.status === "in_progress" ||
      task.status === "done" ||
      task.status === "issue"
        ? task.status
        : "not_started",
    targetDate: typeof task.targetDate === "string" ? task.targetDate : "",
    doneDate: typeof task.doneDate === "string" ? task.doneDate : "",
    notes: typeof task.notes === "string" ? task.notes : "",
    imageIds: Array.isArray(task.imageIds) ? task.imageIds : [],
  };
}

function normalizePhase(p) {
  const phase = p && typeof p === "object" ? p : {};
  const tasksRaw = Array.isArray(phase.tasks) ? phase.tasks : [];
  const tasks = tasksRaw.map(normalizeTask);

  return {
    id: typeof phase.id === "string" && phase.id ? phase.id : uid("PH"),
    title: typeof phase.title === "string" ? phase.title : "Untitled Phase",
    targetStart: typeof phase.targetStart === "string" ? phase.targetStart : "",
    targetFinish:
      typeof phase.targetFinish === "string" ? phase.targetFinish : "",
    notes: typeof phase.notes === "string" ? phase.notes : "",
    tasks,
  };
}

function normalizePhases(input) {
  if (!Array.isArray(input)) return [];
  return input.map(normalizePhase);
}

function dedupeById(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item?.id) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

export default function Phases({ phases, setPhases }) {
  const safePhases = useMemo(() => normalizePhases(phases), [phases]);

  const [selectedId, setSelectedId] = useState(() => safePhases[0]?.id ?? null);
  // Import modal state
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importErr, setImportErr] = useState("");
  const [importInfo, setImportInfo] = useState(null); // { phasesCount, tasksCount }

  // Keep selectedId valid as phases change (imports/deletes/first load)
  useEffect(() => {
    if (safePhases.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const exists = safePhases.some((p) => p.id === selectedId);
    if (!exists) setSelectedId(safePhases[0].id);
  }, [safePhases, selectedId]);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return safePhases.find((p) => p.id === selectedId) ?? null;
  }, [safePhases, selectedId]);

  function addPhase() {
    const id = uid("PH");
    const phase = normalizePhase({
      id,
      title: "New Phase",
      targetStart: "",
      targetFinish: "",
      notes: "",
      tasks: [],
    });

    setPhases((prev) => {
      const prevSafe = normalizePhases(prev);
      return [phase, ...prevSafe];
    });

    setSelectedId(id);
  }

  function openImport() {
    setImportErr("");
    setImportInfo(null);
    setImportText("");
    setImportOpen(true);
  }

  function closeImport() {
    setImportOpen(false);
  }

  function validateImportText(text) {
    const parsed = safeParse(text);
    if (!parsed) {
      return {
        ok: false,
        error: "Invalid JSON. Make sure it’s valid JSON text.",
      };
    }

    // Accept either an array of phases OR a full backup object with { phases: [...] }
    let phasesArray = null;

    if (Array.isArray(parsed)) {
      phasesArray = parsed;
    } else if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.phases)
    ) {
      phasesArray = parsed.phases;
    }

    if (!phasesArray) {
      return {
        ok: false,
        error:
          'Import must be either an array of phases OR an object with a "phases" array.',
      };
    }

    const normalized = normalizePhases(phasesArray);

    const phasesCount = normalized.length;
    const tasksCount = normalized.reduce(
      (acc, p) => acc + (p.tasks?.length || 0),
      0,
    );

    return { ok: true, normalized, phasesCount, tasksCount };
  }

  function runValidate() {
    const res = validateImportText(importText);
    if (!res.ok) {
      setImportErr(res.error);
      setImportInfo(null);
      return;
    }
    setImportErr("");
    setImportInfo({ phasesCount: res.phasesCount, tasksCount: res.tasksCount });
  }

  function runImport() {
    const res = validateImportText(importText);
    if (!res.ok) {
      setImportErr(res.error);
      setImportInfo(null);
      return;
    }

    const incoming = res.normalized;

    setPhases((prev) => {
      const base = normalizePhases(prev);
      const merged = [...incoming, ...base];
      return dedupeById(merged);
    });

    setSelectedId(incoming?.[0]?.id ?? null);
    setImportOpen(false);
  }

  function deletePhase(id) {
    const ok = confirm("Delete this phase?");
    if (!ok) return;

    setPhases((prev) => normalizePhases(prev).filter((p) => p.id !== id));

    if (selectedId === id) setSelectedId(null);
  }

  function updatePhase(patch) {
    if (!selected) return;

    setPhases((prev) =>
      normalizePhases(prev).map((p) =>
        p.id === selected.id ? normalizePhase({ ...p, ...patch }) : p,
      ),
    );
  }

  function addTask() {
    if (!selected) return;

    const task = normalizeTask({
      id: uid("T"),
      title: "New Task",
      status: "not_started",
      targetDate: "",
      doneDate: "",
      notes: "",
      imageIds: [],
    });

    updatePhase({ tasks: [task, ...(selected.tasks || [])] });
  }

  function updateTask(taskId, patch) {
    if (!selected) return;

    const tasks = (selected.tasks || []).map((t) =>
      t.id === taskId ? normalizeTask({ ...t, ...patch }) : t,
    );

    updatePhase({ tasks });
  }

  function deleteTask(taskId) {
    if (!selected) return;
    const tasks = (selected.tasks || []).filter((t) => t.id !== taskId);
    updatePhase({ tasks });
  }

  const summary = useMemo(() => {
    const total = safePhases.reduce(
      (acc, p) => acc + (p.tasks?.length || 0),
      0,
    );
    const done = safePhases.reduce(
      (acc, p) =>
        acc + (p.tasks || []).filter((t) => t.status === "done").length,
      0,
    );
    return { total, done };
  }, [safePhases]);

  return (
    <div className="grid gap-4 md:grid-cols-[340px_1fr]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Phases</div>
            <div className="text-xs text-zinc-400">
              Tasks done {summary.done}/{summary.total}
            </div>
          </div>
        </div>

        {/* <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Phases</div>
            <div className="text-xs text-zinc-400">
              Tasks done {summary.done}/{summary.total}
            </div>
          </div>
          <button
            onClick={addPhase}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
          >
            + Phase
          </button>
        </div> */}

        <div className="mt-3 flex gap-2">
          <button
            onClick={openImport}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
          >
            Import
          </button>
          <button
            onClick={addPhase}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
          >
            + Phase
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {safePhases.length === 0 ? (
            <div className="text-sm text-zinc-400">
              No phases yet. Add your first phase.
            </div>
          ) : (
            safePhases.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={[
                  "w-full rounded-2xl border px-4 py-3 text-left transition",
                  selectedId === p.id
                    ? "border-cyan-500/30 bg-cyan-500/10"
                    : "border-zinc-800/70 bg-zinc-950/30 hover:bg-zinc-900/60",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">{p.title}</div>
                <div className="text-xs text-zinc-400">
                  {(p.tasks || []).filter((t) => t.status === "done").length}/
                  {(p.tasks || []).length} done
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
        {!selected ? (
          <div className="text-sm text-zinc-400">Select a phase to edit.</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="text-lg font-semibold">Edit Phase</div>

                <input
                  value={selected.title}
                  onChange={(e) => updatePhase({ title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400">Target Start</div>
                    <input
                      type="date"
                      value={selected.targetStart || ""}
                      onChange={(e) =>
                        updatePhase({ targetStart: e.target.value })
                      }
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-500/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-zinc-400">Target Complete</div>
                    <input
                      type="date"
                      value={selected.targetStart || ""}
                      onChange={(e) =>
                        updatePhase({ targetStart: e.target.value })
                      }
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-500/40"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={addTask}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                >
                  + Task
                </button>
                <button
                  onClick={() => deletePhase(selected.id)}
                  className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                >
                  Delete Phase
                </button>
              </div>
            </div>

            <textarea
              value={selected.notes || ""}
              onChange={(e) => updatePhase({ notes: e.target.value })}
              placeholder="Phase notes..."
              className="w-full min-h-[90px] resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
            />

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="text-sm font-semibold">Tasks</div>

              <div className="mt-3 space-y-3">
                {(selected.tasks || []).map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="flex-1 space-y-2">
                        <input
                          value={t.title}
                          onChange={(e) =>
                            updateTask(t.id, { title: e.target.value })
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                        />

                        <div className="grid gap-2 md:grid-cols-3">
                          <select
                            value={t.status}
                            onChange={(e) =>
                              updateTask(t.id, { status: e.target.value })
                            }
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                          >
                            <option value="not_started">Not started</option>
                            <option value="in_progress">In progress</option>
                            <option value="done">Done</option>
                            <option value="issue">Issue</option>
                          </select>

                          <div className="space-y-1">
                            <div className="text-xs text-zinc-400">
                              Target Start
                            </div>
                            <input
                              type="date"
                              value={selected.targetStart || ""}
                              onChange={(e) =>
                                updatePhase({ targetStart: e.target.value })
                              }
                              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-500/40"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-zinc-400 ">
                              Target Complete
                            </div>
                            <input
                              type="date"
                              value={selected.targetStart || ""}
                              onChange={(e) =>
                                updatePhase({ targetStart: e.target.value })
                              }
                              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-cyan-500/40"
                            />
                          </div>
                        </div>

                        <textarea
                          value={t.notes || ""}
                          onChange={(e) =>
                            updateTask(t.id, { notes: e.target.value })
                          }
                          placeholder="Task notes..."
                          className="w-full min-h-[70px] resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                        />

                        <div className="text-xs text-zinc-500">
                          Images coming next (IndexedDB). We’ll attach photos to
                          tasks.
                        </div>
                      </div>

                      <button
                        onClick={() => deleteTask(t.id)}
                        className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm hover:bg-red-950/60"
                      >
                        Delete Task
                      </button>
                    </div>
                  </div>
                ))}

                {(selected.tasks || []).length === 0 && (
                  <div className="text-sm text-zinc-400">
                    No tasks yet. Add your first task.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {importOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70"
              onClick={closeImport}
            />

            {/* Modal */}
            <div className="relative w-[92vw] max-w-3xl p-4">
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">Import Phases</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      Paste a JSON array of phases. We’ll validate + normalize
                      IDs safely.
                    </div>
                  </div>

                  <button
                    onClick={closeImport}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm hover:bg-zinc-900/70"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-4">
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='Paste JSON here (example: [{"title":"Phase","tasks":[{"title":"Task"}]}])'
                    className="w-full min-h-[260px] resize-y rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-relaxed outline-none focus:border-zinc-600"
                  />

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-h-[20px] text-xs">
                      {importErr ? (
                        <span className="text-red-300">{importErr}</span>
                      ) : importInfo ? (
                        <span className="text-zinc-300">
                          Looks good: <b>{importInfo.phasesCount}</b> phases,{" "}
                          <b>{importInfo.tasksCount}</b> tasks.
                        </span>
                      ) : (
                        <span className="text-zinc-500">
                          Tip: Click “Validate” to preview counts before
                          importing.
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          navigator.clipboard
                            ?.readText?.()
                            .then((t) => setImportText(t || ""))
                            .catch(() => {});
                        }}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                        title="Paste from clipboard (may require permission)"
                      >
                        Paste
                      </button>

                      <button
                        onClick={runValidate}
                        className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
                      >
                        Validate
                      </button>

                      <button
                        onClick={runImport}
                        className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm hover:bg-cyan-500/20"
                      >
                        Import
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 text-[11px] text-zinc-500">
                    Safe behavior: bad JSON won’t import. Non-array JSON won’t
                    import. Missing IDs/titles get auto-filled.
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
