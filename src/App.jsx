import React, { useMemo, useState } from "react";
import rawTrials from "./data/cctro_trials_flat_enriched.json";
import { DISEASE_SITES } from "./data/disease_sites";
import { normalizeTrials, matchesTrial, groupBy, safe } from "./lib/trials";

export default function App() {
  const trials = useMemo(() => normalizeTrials(rawTrials), []);

  const [selectedDst, setSelectedDst] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openTrial, setOpenTrial] = useState(null);

  const [screening, setScreening] = useState({
    dst: "",
    diagnosis: "",
    age: "",
    sex: "",
    biomarker: "",
    priorTherapy: "",
  });

  const screenedTrials = useMemo(() => {
    return trials.filter((trial) => {
      if (screening.dst && trial.dst !== screening.dst) return false;
      if (screening.diagnosis && !keywordMatch(trial, screening.diagnosis)) return false;
      if (screening.biomarker && !keywordMatch(trial, screening.biomarker)) return false;
      if (screening.priorTherapy && !keywordMatch(trial, screening.priorTherapy)) return false;
      if (!ageMatches(trial, screening.age)) return false;
      if (!sexMatches(trial, screening.sex)) return false;
      return true;
    });
  }, [trials, screening]);

  const fullyFilteredTrials = useMemo(() => {
    let result = screenedTrials;

    if (selectedDst !== "ALL") {
      result = result.filter((t) => t.dst === selectedDst);
    }

    if (searchQuery.trim()) {
      result = result.filter((t) => matchesTrial(t, searchQuery));
    }

    return result;
  }, [screenedTrials, selectedDst, searchQuery]);

  const groupedTrials = useMemo(() => {
    const diseaseGroups = groupBy(fullyFilteredTrials, (t) => t.disease || "Unspecified");

    return Array.from(diseaseGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([disease, diseaseTrials]) => {
        const indicationGroups = groupBy(
          diseaseTrials,
          (t) => t.indicationGroup || "Unspecified"
        );

        const groupedIndications = Array.from(indicationGroups.entries()).sort(([a], [b]) =>
          a.localeCompare(b)
        );

        return {
          disease,
          groups: groupedIndications,
        };
      });
  }, [fullyFilteredTrials]);

  const selectedLabel =
    selectedDst === "ALL"
      ? "All CCTRO Trials"
      : DISEASE_SITES.find((s) => s.id === selectedDst)?.label || selectedDst;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 24 }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>CCTRO Trials App</h1>
          <p style={{ marginTop: 8, color: "#475569" }}>
            Browse active clinical trials by disease site, indication, and quick patient screen.
          </p>
        </header>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Quick Patient Screen</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <select
              value={screening.dst}
              onChange={(e) => setScreening({ ...screening, dst: e.target.value })}
              style={inputStyle}
            >
              <option value="">All Disease Sites</option>
              {DISEASE_SITES.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Diagnosis (e.g. gastric cancer)"
              value={screening.diagnosis}
              onChange={(e) => setScreening({ ...screening, diagnosis: e.target.value })}
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Age"
              value={screening.age}
              onChange={(e) => setScreening({ ...screening, age: e.target.value })}
              style={inputStyle}
            />

            <select
              value={screening.sex}
              onChange={(e) => setScreening({ ...screening, sex: e.target.value })}
              style={inputStyle}
            >
              <option value="">Any Sex</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>

            <input
              type="text"
              placeholder="Biomarker / mutation (e.g. HER2, Claudin18.2)"
              value={screening.biomarker}
              onChange={(e) => setScreening({ ...screening, biomarker: e.target.value })}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Prior therapy / line (e.g. first-line, prior platinum)"
              value={screening.priorTherapy}
              onChange={(e) => setScreening({ ...screening, priorTherapy: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() =>
                setScreening({
                  dst: "",
                  diagnosis: "",
                  age: "",
                  sex: "",
                  biomarker: "",
                  priorTherapy: "",
                })
              }
              style={buttonStyle(false)}
            >
              Clear Quick Screen
            </button>

            <div style={{ alignSelf: "center", fontSize: 14, color: "#475569" }}>
              Matching trials: <strong>{screenedTrials.length}</strong>
            </div>
          </div>
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
            <button
              onClick={() => setSelectedDst("ALL")}
              style={buttonStyle(selectedDst === "ALL")}
            >
              All CCTRO Trials
            </button>

            {DISEASE_SITES.map((site) => (
              <button
                key={site.id}
                onClick={() => setSelectedDst(site.id)}
                style={buttonStyle(selectedDst === site.id)}
              >
                {site.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search by title, NCT, protocol, sponsor, status, disease..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: "1 1 420px",
                minWidth: 260,
                padding: "12px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                fontSize: 14,
              }}
            />

            <button
              onClick={() => setSearchQuery("")}
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Clear Search
            </button>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard label="All CCTRO trials (loaded)" value={trials.length} />
          <StatCard label="Quick Screen matches" value={screenedTrials.length} />
          <StatCard label="Currently viewing" value={fullyFilteredTrials.length} />
          <StatCard label="Disease site" value={selectedLabel} />
        </section>

        {fullyFilteredTrials.length === 0 ? (
          <section
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <h2 style={{ marginTop: 0 }}>No trials found</h2>
            <p style={{ marginBottom: 0, color: "#475569" }}>
              Try clearing the quick screen, search box, or disease-site filter.
            </p>
          </section>
        ) : (
          groupedTrials.map((diseaseBlock) => (
            <section key={diseaseBlock.disease} style={{ marginBottom: 28 }}>
              <div
                style={{
                  background: "#0f172a",
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: 12,
                  marginBottom: 12,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 22 }}>{diseaseBlock.disease}</h2>
              </div>

              {diseaseBlock.groups.map(([indicationGroup, groupTrials]) => (
                <div key={`${diseaseBlock.disease}-${indicationGroup}`} style={{ marginBottom: 18 }}>
                  <h3
                    style={{
                      margin: "8px 0 12px 0",
                      fontSize: 18,
                      color: "#1e293b",
                    }}
                  >
                    {indicationGroup} ({groupTrials.length})
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {groupTrials.map((trial) => (
                      <TrialCard
                        key={`${trial.id}-${trial.nct || trial.title}`}
                        trial={trial}
                        openTrial={openTrial}
                        setOpenTrial={setOpenTrial}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
      }}
    >
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function TrialCard({ trial, openTrial, setOpenTrial }) {
  const trialKey = `${trial.id}-${trial.nct || trial.title}`;
  const isOpen = openTrial === trialKey;

  const toggle = () => {
    setOpenTrial(isOpen ? null : trialKey);
  };

  const ctgovLink =
    trial.link || (trial.nct ? `https://clinicaltrials.gov/study/${trial.nct}` : "");

  const eligibilityText =
    trial.eligibility?.eligibilityCriteria ||
    trial.eligibilityCriteria ||
    "";

  const inclusionText = extractInclusion(eligibilityText);
  const exclusionText = extractExclusion(eligibilityText);

  const shortTitle = safe(trial.title).startsWith(`${safe(trial.id)}:`)
    ? safe(trial.title).replace(`${safe(trial.id)}:`, "").trim()
    : safe(trial.title).startsWith(`${safe(trial.id)} `)
    ? safe(trial.title).replace(`${safe(trial.id)} `, "").trim()
    : safe(trial.title);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div
        onClick={toggle}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            fontSize: 14,
            color: "#475569",
            minWidth: 14,
          }}
        >
          ▶
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>
            {safe(trial.dst)} {trial.phase ? `• ${safe(trial.phase)}` : ""}
          </div>

          <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.35, color: "#0f172a" }}>
            {safe(trial.id)}: {shortTitle}
          </div>
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
            <InfoRow label="Protocol ID" value={safe(trial.id) || "—"} />
            <InfoRow label="NCT" value={safe(trial.nct) || "—"} />
            <InfoRow label="Disease Site" value={safe(trial.dst) || "—"} />
            <InfoRow label="Disease" value={safe(trial.disease) || "—"} />
            <InfoRow label="Group" value={safe(trial.indicationGroup) || "—"} />
            <InfoRow label="Indication" value={safe(trial.indication) || "—"} />
            <InfoRow label="Status" value={safe(trial.status) || "—"} />
            {trial.sponsor ? <InfoRow label="Sponsor" value={safe(trial.sponsor)} /> : null}
            {trial.pi ? <InfoRow label="PI" value={safe(trial.pi)} /> : null}
            {trial.lastUpdated ? (
              <InfoRow label="Last Updated" value={safe(trial.lastUpdated)} />
            ) : null}
          </div>

          {trial.protocol && trial.protocol !== trial.title ? (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 4,
                }}
              >
                Full Protocol
              </div>
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
                {safe(trial.protocol)}
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#475569",
                marginBottom: 6,
              }}
            >
              Eligibility Criteria
            </div>

            <details style={criteriaBox}>
              <summary style={criteriaTitle}>Inclusion Criteria</summary>
              <div style={criteriaText}>
                {inclusionText || "Not available for this trial in the current data file."}
              </div>
            </details>

            <details style={criteriaBox}>
              <summary style={criteriaTitle}>Exclusion Criteria</summary>
              <div style={criteriaText}>
                {exclusionText || "Not available for this trial in the current data file."}
              </div>
            </details>
          </div>

          {Array.isArray(trial.keywords) && trial.keywords.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                Keywords
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {trial.keywords.slice(0, 8).map((kw, idx) => (
                  <span
                    key={`${kw}-${idx}`}
                    style={{
                      fontSize: 12,
                      background: "#e2e8f0",
                      color: "#334155",
                      padding: "4px 8px",
                      borderRadius: 999,
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            {ctgovLink ? (
              <a
                href={ctgovLink}
                target="_blank"
                rel="noreferrer"
                style={linkButtonStyle("#0f172a", "#fff")}
              >
                ClinicalTrials.gov
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <strong>{label}:</strong> {value}
    </div>
  );
}

function extractInclusion(text) {
  const value = text || "";
  const match = value.match(/Inclusion Criteria:\s*([\s\S]*?)(Exclusion Criteria:|$)/i);
  return match ? match[1].trim() : "";
}

function extractExclusion(text) {
  const value = text || "";
  const match = value.match(/Exclusion Criteria:\s*([\s\S]*)/i);
  return match ? match[1].trim() : "";
}

function keywordMatch(trial, text) {
  if (!text) return true;

  const haystack = [
    trial.title,
    trial.protocol,
    trial.disease,
    trial.indicationGroup,
    trial.indication,
    ...(trial.keywords || []),
    trial.eligibility?.eligibilityCriteria || "",
    trial.eligibilityCriteria || "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function ageMatches(trial, age) {
  if (!age) return true;

  const n = Number(age);
  if (Number.isNaN(n)) return true;

  const minAgeText = trial.eligibility?.minimumAge || trial.minimumAge || "";
  const maxAgeText = trial.eligibility?.maximumAge || trial.maximumAge || "";

  const minMatch = safe(minAgeText).match(/(\d+)/);
  const maxMatch = safe(maxAgeText).match(/(\d+)/);

  const minAge = minMatch ? Number(minMatch[1]) : null;
  const maxAge = maxMatch ? Number(maxMatch[1]) : null;

  if (minAge !== null && n < minAge) return false;
  if (maxAge !== null && n > maxAge) return false;

  return true;
}

function sexMatches(trial, sex) {
  if (!sex) return true;

  const allowed = safe(trial.eligibility?.sex || trial.sex).toUpperCase();

  if (!allowed || allowed === "ALL") return true;
  return allowed === safe(sex).toUpperCase();
}

function buttonStyle(active) {
  return {
    padding: "10px 14px",
    borderRadius: 999,
    border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
    background: active ? "#0f172a" : "#ffffff",
    color: active ? "#ffffff" : "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
  };
}

function linkButtonStyle(bg, color) {
  return {
    display: "inline-block",
    textDecoration: "none",
    background: bg,
    color,
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 600,
  };
}

const inputStyle = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
};

const criteriaBox = {
  marginBottom: 10,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: 10,
};

const criteriaTitle = {
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 13,
  color: "#0f172a",
};

const criteriaText = {
  marginTop: 10,
  fontSize: 13,
  color: "#334155",
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  maxHeight: 220,
  overflowY: "auto",
};