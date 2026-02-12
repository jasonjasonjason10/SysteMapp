import { useMemo, useState } from "react";

function uid(prefix = "PH") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

export default function Phases({ phases, setPhases }) {
  const [selectedId, setSelectedId] = useState(phases?.[0]?.id ?? null);

  const selected = useMemo(
    () => phases.find((p) => p.id === selectedId) ?? null,
    [phases, selectedId],
  );

  function addPhase() {
    const id = uid("PH");
    const phase = {
      id,
      title: "New Phase",
      targetStart: "",
      targetFinish: "",
      notes: "",
      tasks: [],
    };
    setPhases((prev) => [phase, ...(prev || [])]);
    setSelectedId(id);
  }

  function deletePhase(id) {
    const ok = confirm("Delete this phase?");
    if (!ok) return;
    setPhases((prev) => (prev || []).filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updatePhase(patch) {
    if (!selected) return;
    setPhases((prev) =>
      (prev || []).map((p) => (p.id === selected.id ? { ...p, ...patch } : p)),
    );
  }

  function addTask() {
    if (!selected) return;
    const task = {
      id: uid("T"),
      title: "New Task",
      status: "not_started", // not_started | in_progress | done | issue
      targetDate: "",
      doneDate: "",
      notes: "",
      imageIds: [],
    };
    updatePhase({ tasks: [task, ...(selected.tasks || [])] });
  }

  function updateTask(taskId, patch) {
    const tasks = (selected?.tasks || []).map((t) =>
      t.id === taskId ? { ...t, ...patch } : t,
    );
    updatePhase({ tasks });
  }

  function deleteTask(taskId) {
    const tasks = (selected?.tasks || []).filter((t) => t.id !== taskId);
    updatePhase({ tasks });
  }

  const summary = useMemo(() => {
    const total = phases.reduce((acc, p) => acc + (p.tasks?.length || 0), 0);
    const done = phases.reduce(
      (acc, p) =>
        acc + (p.tasks || []).filter((t) => t.status === "done").length,
      0,
    );
    return { total, done };
  }, [phases]);

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
          <button
            onClick={addPhase}
            className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
          >
            + Phase
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {phases.length === 0 ? (
            <div className="text-sm text-zinc-400">
              No phases yet. Add your first phase.
            </div>
          ) : (
            phases.map((p) => (
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
                  <input
                    value={selected.targetStart || ""}
                    onChange={(e) =>
                      updatePhase({ targetStart: e.target.value })
                    }
                    placeholder="Target start (YYYY-MM-DD)"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                  />
                  <input
                    value={selected.targetFinish || ""}
                    onChange={(e) =>
                      updatePhase({ targetFinish: e.target.value })
                    }
                    placeholder="Target finish (YYYY-MM-DD)"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                  />
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

                          <input
                            value={t.targetDate || ""}
                            onChange={(e) =>
                              updateTask(t.id, { targetDate: e.target.value })
                            }
                            placeholder="Target date"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                          />

                          <input
                            value={t.doneDate || ""}
                            onChange={(e) =>
                              updateTask(t.id, { doneDate: e.target.value })
                            }
                            placeholder="Done date"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                          />
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
    </div>
  );
}
