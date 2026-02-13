// export const LS_KEY = "van-build-ops:v1";

// export const EMPTY_STATE = {
//   wiringRuns: [],
//   parts: [],
//   phases: [],
//   guidesById: {}, // { [id]: Guide }
//   guideTree: [], // folder nodes
//   imagesIndex: {}, // later: IndexedDB pointers
// };

// export function loadOps() {
//   try {
//     const raw = localStorage.getItem(LS_KEY);
//     if (!raw) return null;
//     const parsed = JSON.parse(raw);
//     return parsed && typeof parsed === "object" ? parsed : null;
//   } catch {
//     return null;
//   }
// }

// export function saveOps(ops) {
//   localStorage.setItem(LS_KEY, JSON.stringify(ops));
// }

// export function downloadJSON(filename, data) {
//   const blob = new Blob([JSON.stringify(data, null, 2)], {
//     type: "application/json",
//   });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   a.remove();
//   URL.revokeObjectURL(url);
// }

// export function safeParse(json) {
//   try {
//     return JSON.parse(json);
//   } catch {
//     return null;
//   }
// }

// export function validateOpsShape(obj) {
//   if (!obj || typeof obj !== "object") return false;
//   // minimal validation (keep it forgiving)
//   if (!("wiringRuns" in obj)) return false;
//   if (!("parts" in obj)) return false;
//   if (!("phases" in obj)) return false;
//   if (!("guidesById" in obj)) return false;
//   if (!("guideTree" in obj)) return false;
//   return true;
// }

export const LS_KEY = "van-build-ops:v1";

export const EMPTY_STATE = {
  wiringRuns: [],
  parts: [],
  fuses: [], // ✅ new
  phases: [],
  guidesById: {}, // { [id]: Guide }
  guideTree: [], // folder nodes
  imagesIndex: {}, // later: IndexedDB pointers
};

export function loadOps() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveOps(ops) {
  localStorage.setItem(LS_KEY, JSON.stringify(ops));
}

export function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function validateOpsShape(obj) {
  if (!obj || typeof obj !== "object") return false;

  // minimal required keys (keep forgiving)
  if (!("wiringRuns" in obj)) return false;
  if (!("parts" in obj)) return false;
  if (!("phases" in obj)) return false;
  if (!("guidesById" in obj)) return false;
  if (!("guideTree" in obj)) return false;

  // fuses is OPTIONAL (backwards compatible)
  // If present, it should be an array (but we won't reject if it's missing)
  if ("fuses" in obj && !Array.isArray(obj.fuses)) return false;

  return true;
}
