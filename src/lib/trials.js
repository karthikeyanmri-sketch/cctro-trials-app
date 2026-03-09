// src/lib/trials.js

export function safe(s) {
  return (s ?? "").toString();
}

export function normalize(s) {
  return safe(s).trim().toLowerCase();
}

export function matchesTrial(trial, q) {
  const haystack = [
    trial.id,
    trial.nct,
    trial.title,
    trial.protocol,
    trial.sponsor,
    trial.status,
    trial.phase,
    trial.dst,
    trial.disease,
    trial.indicationGroup,
    trial.indication,
    trial.notes,
    ...(trial.keywords ?? []),
  ]
    .filter(Boolean)
    .map(normalize)
    .join(" ");

  return haystack.includes(normalize(q));
}

export function groupBy(arr, keyFn) {
  const m = new Map();
  for (const item of arr) {
    const k = keyFn(item) ?? "Unspecified";
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(item);
  }
  return m;
}

/** DST alias mapping (normalize incoming values into your app's IDs) */
const DST_ALIASES = {
  THORACIC: "TOC",
  TOC: "TOC",
  NEURO: "NEURO",
  "NEURO/BRAIN": "NEURO",
  "NEURO / BRAIN": "NEURO",
  "NEURO/ BRAIN": "NEURO",
  BRAIN: "NEURO",
};

function normalizeDst(dst) {
  const raw = safe(dst).trim().toUpperCase();
  return DST_ALIASES[raw] ?? raw;
}

/** Your one-and-only normalizeTrials */
export function normalizeTrials(rawTrials) {
  if (!Array.isArray(rawTrials)) return [];

  return rawTrials
    .map((t) => {
      const keywords = Array.isArray(t.keywords)
        ? t.keywords
        : typeof t.keywords === "string"
        ? t.keywords
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean)
        : [];

      return {
        ...t,
        id: safe(t.id).trim(),
        dst: normalizeDst(t.dst), // ✅ applies alias mapping here
        disease: safe(t.disease).trim(),
        indicationGroup: safe(t.indicationGroup).trim(),
        indication: t.indication ? safe(t.indication).trim() : undefined,
        nct: t.nct ? safe(t.nct).trim() : undefined,
        title: safe(t.title).trim(),
        protocol: safe(t.protocol).trim(),
        status: t.status ? safe(t.status).trim() : "Open to Accrual",
        phase: t.phase ? safe(t.phase).trim() : undefined,
        pi: t.pi ? safe(t.pi).trim() : undefined,
        sponsor: t.sponsor ? safe(t.sponsor).trim() : undefined,
        notes: t.notes ? safe(t.notes).trim() : undefined,
        keywords,
        lastUpdated: t.lastUpdated ? safe(t.lastUpdated).trim() : "",
        link: t.link ? safe(t.link).trim() : undefined,
      };
    })
    .filter(
      (t) =>
        t.dst &&
        t.disease &&
        t.indicationGroup &&
        t.id &&
        t.title &&
        t.protocol
    );
}