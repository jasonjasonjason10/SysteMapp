import { useMemo, useState } from "react";

function uid(prefix = "G") {
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  const time = Date.now().toString(16).slice(-4).toUpperCase();
  return `${prefix}-${time}${rand}`;
}

/**
 * guideTree node shape:
 * { id, type: "folder"|"guide", title, children?: node[] , guideId?: string }
 *
 * guidesById shape:
 * { [guideId]: { id, title, category, tools:[], materials:[], specs:[], warnings:[], steps:[], notes:"" } }
 */

export default function Guides({
  guidesById,
  guideTree,
  setGuidesById,
  setGuideTree,
}) {
  const [selectedGuideId, setSelectedGuideId] = useState(null);

  const selectedGuide = selectedGuideId ? guidesById?.[selectedGuideId] : null;

  const flat = useMemo(() => flattenTree(guideTree), [guideTree]);

  function addRootFolder() {
    const id = uid("F");
    setGuideTree((prev) => [
      ...prev,
      { id, type: "folder", title: "New Folder", children: [] },
    ]);
  }

  function addGuideAtRoot() {
    const guideId = uid("GUIDE");
    const guide = emptyGuide(guideId);

    setGuidesById((prev) => ({ ...prev, [guideId]: guide }));
    setGuideTree((prev) => [
      ...prev,
      { id: uid("N"), type: "guide", title: guide.title, guideId },
    ]);
    setSelectedGuideId(guideId);
  }

  function updateNodeTitle(nodeId, title) {
    setGuideTree((prev) => updateNode(prev, nodeId, (n) => ({ ...n, title })));
  }

  function deleteNode(nodeId) {
    const toDeleteGuideIds = collectGuideIdsByNodeId(guideTree, nodeId);
    setGuideTree((prev) => removeNode(prev, nodeId));
    if (toDeleteGuideIds.length) {
      setGuidesById((prev) => {
        const next = { ...prev };
        for (const gid of toDeleteGuideIds) delete next[gid];
        return next;
      });
      if (selectedGuideId && toDeleteGuideIds.includes(selectedGuideId)) {
        setSelectedGuideId(null);
      }
    }
  }

  function addChildFolder(parentId) {
    const id = uid("F");
    setGuideTree((prev) =>
      updateNode(prev, parentId, (n) => ({
        ...n,
        children: [
          ...(n.children || []),
          { id, type: "folder", title: "New Folder", children: [] },
        ],
      })),
    );
  }

  function addChildGuide(parentId) {
    const guideId = uid("GUIDE");
    const guide = emptyGuide(guideId);
    setGuidesById((prev) => ({ ...prev, [guideId]: guide }));

    setGuideTree((prev) =>
      updateNode(prev, parentId, (n) => ({
        ...n,
        children: [
          ...(n.children || []),
          { id: uid("N"), type: "guide", title: guide.title, guideId },
        ],
      })),
    );
    setSelectedGuideId(guideId);
  }

  function updateSelectedGuide(patch) {
    if (!selectedGuideId) return;
    setGuidesById((prev) => ({
      ...prev,
      [selectedGuideId]: { ...prev[selectedGuideId], ...patch },
    }));
  }

  function updateSelectedStep(stepIndex, patch) {
    if (!selectedGuideId) return;
    const guide = guidesById[selectedGuideId];
    const steps = [...(guide.steps || [])];
    steps[stepIndex] = { ...steps[stepIndex], ...patch };
    updateSelectedGuide({ steps });
  }

  function addStep() {
    if (!selectedGuideId) return;
    const guide = guidesById[selectedGuideId];
    const steps = [...(guide.steps || [])];
    steps.push({
      id: uid("STEP"),
      title: "New Step",
      detail: "",
      checklist: [],
    });
    updateSelectedGuide({ steps });
  }

  function deleteStep(stepIndex) {
    if (!selectedGuideId) return;
    const guide = guidesById[selectedGuideId];
    const steps = [...(guide.steps || [])];
    steps.splice(stepIndex, 1);
    updateSelectedGuide({ steps });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[360px_1fr]">
      {/* Left: Library */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Guide Library</div>
            <div className="text-xs text-zinc-400">Folders → Guides</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addRootFolder}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
            >
              + Folder
            </button>
            <button
              onClick={addGuideAtRoot}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
            >
              + Guide
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {guideTree.length === 0 ? (
            <div className="text-sm text-zinc-400">
              No guides yet. Create a folder like <b>Electrical</b>,{" "}
              <b>Plumbing</b>, <b>Heating</b>, then add guides inside.
            </div>
          ) : (
            guideTree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedGuideId={selectedGuideId}
                onSelectGuide={setSelectedGuideId}
                onRename={(id, title) => updateNodeTitle(id, title)}
                onDelete={(id) => deleteNode(id)}
                onAddFolder={(id) => addChildFolder(id)}
                onAddGuide={(id) => addChildGuide(id)}
              />
            ))
          )}
        </div>

        <div className="mt-4 text-xs text-zinc-500">
          Next: we’ll add “Paste JSON Pack” to instantly import manuals like the
          diesel heater guide.
        </div>
      </div>

      {/* Right: Editor */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 p-4">
        {!selectedGuide ? (
          <div className="text-sm text-zinc-400">
            Select a guide to edit it, or create a new guide.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-lg font-semibold">Edit Guide</div>
                <div className="text-xs text-zinc-400">
                  This auto-saves to your Ops backup.
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Title">
                <input
                  value={selectedGuide.title}
                  onChange={(e) =>
                    updateSelectedGuide({ title: e.target.value })
                  }
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
              </Field>

              <Field label="Category (optional)">
                <input
                  value={selectedGuide.category || ""}
                  onChange={(e) =>
                    updateSelectedGuide({ category: e.target.value })
                  }
                  placeholder="Electrical / Plumbing / Heating"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={selectedGuide.notes || ""}
                onChange={(e) => updateSelectedGuide({ notes: e.target.value })}
                className="w-full min-h-[90px] resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <ListEditor
                title="Tools"
                items={selectedGuide.tools || []}
                onChange={(tools) => updateSelectedGuide({ tools })}
              />
              <ListEditor
                title="Materials"
                items={selectedGuide.materials || []}
                onChange={(materials) => updateSelectedGuide({ materials })}
              />
              <ListEditor
                title="Specs"
                items={selectedGuide.specs || []}
                onChange={(specs) => updateSelectedGuide({ specs })}
              />
              <ListEditor
                title="Warnings"
                items={selectedGuide.warnings || []}
                onChange={(warnings) => updateSelectedGuide({ warnings })}
              />
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Steps</div>
                <button
                  onClick={addStep}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
                >
                  + Step
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {(selectedGuide.steps || []).map((s, idx) => (
                  <div
                    key={s.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          value={s.title}
                          onChange={(e) =>
                            updateSelectedStep(idx, { title: e.target.value })
                          }
                          className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                        <textarea
                          value={s.detail || ""}
                          onChange={(e) =>
                            updateSelectedStep(idx, { detail: e.target.value })
                          }
                          placeholder="Step detail..."
                          className="w-full min-h-[70px] resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
                        />
                      </div>
                      <button
                        onClick={() => deleteStep(idx)}
                        className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs hover:bg-red-950/60"
                      >
                        Delete
                      </button>
                    </div>

                    <div className="mt-3">
                      <ChecklistEditor
                        checklist={s.checklist || []}
                        onChange={(checklist) =>
                          updateSelectedStep(idx, { checklist })
                        }
                      />
                    </div>
                  </div>
                ))}

                {(selectedGuide.steps || []).length === 0 && (
                  <div className="text-sm text-zinc-400">
                    No steps yet. Add your first step.
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-zinc-500">
              Images: next step we’ll add IndexedDB storage and attach photos to
              steps/tasks.
            </div>
          </div>
        )}
      </div>

      {/* Debug panel: optional */}
      <div className="md:col-span-2 text-xs text-zinc-600">
        Total nodes: {flat.length} • Guides:{" "}
        {Object.keys(guidesById || {}).length}
      </div>
    </div>
  );
}

function TreeNode({
  node,
  selectedGuideId,
  onSelectGuide,
  onRename,
  onDelete,
  onAddFolder,
  onAddGuide,
  level = 0,
}) {
  const pad = 12 + level * 12;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40">
      <div
        className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ paddingLeft: pad }}
      >
        <div className="flex-1">
          <input
            value={node.title}
            onChange={(e) => onRename(node.id, e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-2 py-2 text-sm outline-none focus:border-zinc-600"
          />
          <div className="mt-1 text-[11px] text-zinc-500">
            {node.type === "folder" ? "Folder" : "Guide"}
          </div>
        </div>

        {node.type === "folder" ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onAddFolder(node.id)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
            >
              + Folder
            </button>
            <button
              onClick={() => onAddGuide(node.id)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs hover:bg-zinc-800/60"
            >
              + Guide
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs hover:bg-red-950/60"
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onSelectGuide(node.guideId)}
              className={[
                "rounded-xl border px-3 py-2 text-xs",
                selectedGuideId === node.guideId
                  ? "border-cyan-500/30 bg-cyan-500/10"
                  : "border-zinc-800 bg-zinc-950 hover:bg-zinc-800/60",
              ].join(" ")}
            >
              Open
            </button>
            <button
              onClick={() => onDelete(node.id)}
              className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs hover:bg-red-950/60"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {node.type === "folder" && (node.children || []).length > 0 && (
        <div className="pb-2">
          <div className="mt-2 space-y-2 px-2">
            {node.children.map((child) => (
              <TreeNode
                key={child.id}
                node={child}
                selectedGuideId={selectedGuideId}
                onSelectGuide={onSelectGuide}
                onRename={onRename}
                onDelete={onDelete}
                onAddFolder={onAddFolder}
                onAddGuide={onAddGuide}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </div>
      {children}
    </div>
  );
}

function ListEditor({ title, items, onChange }) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([v, ...items]);
    setDraft("");
  }

  function removeAt(idx) {
    const next = [...items];
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add ${title.toLowerCase()}...`}
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
        />
        <button
          onClick={add}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
        >
          Add
        </button>
      </div>

      <div className="mt-2 space-y-2">
        {items.map((t, idx) => (
          <div
            key={`${t}-${idx}`}
            className="flex items-start justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
          >
            <div className="text-sm text-zinc-200">{t}</div>
            <button
              onClick={() => removeAt(idx)}
              className="rounded-lg border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs hover:bg-red-950/60"
            >
              Remove
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-zinc-500">None</div>
        )}
      </div>
    </div>
  );
}

function ChecklistEditor({ checklist, onChange }) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...checklist, v]);
    setDraft("");
  }

  function removeAt(idx) {
    const next = [...checklist];
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Checklist
      </div>

      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add checklist item..."
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-zinc-600"
        />
        <button
          onClick={add}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm hover:bg-zinc-800/60"
        >
          Add
        </button>
      </div>

      <div className="mt-2 space-y-2">
        {checklist.map((c, idx) => (
          <div
            key={`${c}-${idx}`}
            className="flex items-start justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2"
          >
            <div className="text-sm text-zinc-200">{c}</div>
            <button
              onClick={() => removeAt(idx)}
              className="rounded-lg border border-red-900/60 bg-red-950/30 px-2 py-1 text-xs hover:bg-red-950/60"
            >
              Remove
            </button>
          </div>
        ))}
        {checklist.length === 0 && (
          <div className="text-sm text-zinc-500">None</div>
        )}
      </div>
    </div>
  );
}

function emptyGuide(id) {
  return {
    id,
    title: "New Guide",
    category: "",
    tools: [],
    materials: [],
    specs: [],
    warnings: [],
    steps: [],
    notes: "",
    images: [],
  };
}

function flattenTree(nodes) {
  const out = [];
  const walk = (arr) => {
    for (const n of arr) {
      out.push(n);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes || []);
  return out;
}

function updateNode(nodes, nodeId, fn) {
  return (nodes || []).map((n) => {
    if (n.id === nodeId) return fn(n);
    if (n.children?.length)
      return { ...n, children: updateNode(n.children, nodeId, fn) };
    return n;
  });
}

function removeNode(nodes, nodeId) {
  const filtered = (nodes || []).filter((n) => n.id !== nodeId);
  return filtered.map((n) =>
    n.children?.length ? { ...n, children: removeNode(n.children, nodeId) } : n,
  );
}

function collectGuideIdsByNodeId(tree, nodeId) {
  // find the node, then collect all guideIds in its subtree
  const node = findNode(tree, nodeId);
  if (!node) return [];
  return collectGuideIds(node);
}

function findNode(nodes, nodeId) {
  for (const n of nodes || []) {
    if (n.id === nodeId) return n;
    if (n.children?.length) {
      const hit = findNode(n.children, nodeId);
      if (hit) return hit;
    }
  }
  return null;
}

function collectGuideIds(node) {
  const ids = [];
  const walk = (n) => {
    if (n.type === "guide" && n.guideId) ids.push(n.guideId);
    if (n.children?.length) n.children.forEach(walk);
  };
  walk(node);
  return ids;
}
