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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-6 py-8 text-white shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-slate-100">
                Henry Ford Health • CCTRO
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Clinical Trials Navigator
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-200 sm:text-base">
                Identify potential clinical trials by disease site, biomarkers,
                treatment history, and eligibility criteria with a clean,
                physician-friendly workflow.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat label="Trials Loaded" value={trials.length} />
              <HeroStat label="Quick Matches" value={screenedTrials.length} />
              <HeroStat label="Viewing" value={fullyFilteredTrials.length} />
              <HeroStat label="Site Filter" value={selectedDst === "ALL" ? "All" : selectedDst} />
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Quick Patient Screen</h2>
              <p className="mt-1 text-sm text-slate-500">
                Narrow likely trials using diagnosis, biomarker, sex, age, and prior therapy.
              </p>
            </div>
            <div className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {screenedTrials.length} potential matches
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <select
              value={screening.dst}
              onChange={(e) => setScreening({ ...screening, dst: e.target.value })}
              className={inputClass}
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
              className={inputClass}
            />

            <input
              type="number"
              placeholder="Age"
              value={screening.age}
              onChange={(e) => setScreening({ ...screening, age: e.target.value })}
              className={inputClass}
            />

            <select
              value={screening.sex}
              onChange={(e) => setScreening({ ...screening, sex: e.target.value })}
              className={inputClass}
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
              className={inputClass}
            />

            <input
              type="text"
              placeholder="Prior therapy / line (e.g. first-line, prior platinum)"
              value={screening.priorTherapy}
              onChange={(e) => setScreening({ ...screening, priorTherapy: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
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
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear Quick Screen
            </button>

            <div className="text-sm text-slate-500">
              Current screen:
              <span className="ml-2 font-medium text-slate-800">
                {screening.dst ||
                screening.diagnosis ||
                screening.age ||
                screening.sex ||
                screening.biomarker ||
                screening.priorTherapy
                  ? "Active"
                  : "None"}
              </span>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Trial Browser</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filter by disease site and search across protocol details, NCT, sponsor, and status.
              </p>
            </div>

            <div className="min-w-0 flex-1 xl:max-w-xl">
              <input
                type="text"
                placeholder="Search by title, NCT, protocol, sponsor, status, disease..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <FilterChip
              active={selectedDst === "ALL"}
              onClick={() => setSelectedDst("ALL")}
              label="All CCTRO Trials"
            />
            {DISEASE_SITES.map((site) => (
              <FilterChip
                key={site.id}
                active={selectedDst === site.id}
                onClick={() => setSelectedDst(site.id)}
                label={site.label}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <button
              onClick={() => setSearchQuery("")}
              className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear Search
            </button>
            <span>
              Viewing <span className="font-semibold text-slate-800">{fullyFilteredTrials.length}</span>{" "}
              trials in <span className="font-semibold text-slate-800">{selectedLabel}</span>
            </span>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="All Trials Loaded" value={trials.length} />
          <StatCard label="Quick Screen Matches" value={screenedTrials.length} />
          <StatCard label="Filtered Results" value={fullyFilteredTrials.length} />
          <StatCard label="Active Disease Filter" value={selectedLabel} />
        </section>

        {fullyFilteredTrials.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">No trials found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Try clearing the quick screen, search box, or disease-site filter.
            </p>
          </section>
        ) : (
          groupedTrials.map((diseaseBlock) => (
            <section key={diseaseBlock.disease} className="mb-8">
              <div className="mb-4 rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-sm">
                <h2 className="text-xl font-semibold">{diseaseBlock.disease}</h2>
              </div>

              {diseaseBlock.groups.map(([indicationGroup, groupTrials]) => (
                <div key={`${diseaseBlock.disease}-${indicationGroup}`} className="mb-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {indicationGroup}
                    </h3>
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                      {groupTrials.length} trials
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {groupTrials.map((trial) => (
                      <TrialCard
                        key={`${trial.id}-${trial.nct || trial.title}`}
                        trial={trial}
                        openTrial={openTrial}
                        setOpenTrial={setOpenTrial}
                        screening={screening}
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

function HeroStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-wide text-slate-300">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function TrialCard({ trial, openTrial, setOpenTrial, screening }) {
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
  const matchReasons = getMatchReasons(trial, screening);
  const drugBadges = extractDrugBadges(trial);
  const shortTitle = safe(trial.title).startsWith(`${safe(trial.id)}:`)
    ? safe(trial.title).replace(`${safe(trial.id)}:`, "").trim()
    : safe(trial.title).startsWith(`${safe(trial.id)} `)
    ? safe(trial.title).replace(`${safe(trial.id)} `, "").trim()
    : safe(trial.title);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start gap-3 px-5 py-4 text-left"
      >
        <div
          className={[
            "mt-1 shrink-0 text-xs text-slate-500 transition-transform",
            isOpen ? "rotate-90" : "rotate-0",
          ].join(" ")}
        >
          ▶
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
              {safe(trial.dst) || "Site"}
            </span>
            {trial.phase ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                {safe(trial.phase)}
              </span>
            ) : null}
            {trial.status ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                {safe(trial.status)}
              </span>
            ) : null}
          </div>
{drugBadges.length > 0 ? (
  <div className="mt-2 flex flex-wrap gap-2">
    {drugBadges.map((drug) => (
      <span
        key={drug}
        className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
      >
        {drug}
      </span>
    ))}
  </div>
) : null}
          <div className="text-lg font-semibold leading-6 text-slate-900">
            {safe(trial.id)}: {shortTitle}
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 px-5 py-5">
          <div className="grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <InfoRow label="Protocol ID" value={safe(trial.id) || "—"} />
            <InfoRow label="NCT" value={safe(trial.nct) || "—"} />
            <InfoRow label="Disease Site" value={safe(trial.dst) || "—"} />
            <InfoRow label="Disease" value={safe(trial.disease) || "—"} />
            <InfoRow label="Group" value={safe(trial.indicationGroup) || "—"} />
            <InfoRow label="Indication" value={safe(trial.indication) || "—"} />
            <InfoRow label="Status" value={safe(trial.status) || "—"} />
            {trial.sponsor ? <InfoRow label="Sponsor" value={safe(trial.sponsor)} /> : null}
{trial.lastUpdated ? (
  <InfoRow label="Last Updated" value={safe(trial.lastUpdated)} />
) : null}
          </div>

          {matchReasons.length > 0 ? (
            <section className="mt-5">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Why this matched</h4>
              <div className="flex flex-wrap gap-2">
                {matchReasons.map((reason, idx) => (
                  <span
                    key={`${reason}-${idx}`}
                    className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
{drugBadges.length > 0 ? (
  <div className="mt-2 flex flex-wrap gap-2">
    {drugBadges.map((drug) => (
      <span
        key={drug}
        className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700"
      >
        {drug}
      </span>
    ))}
  </div>
) : null}
          {trial.protocol && trial.protocol !== trial.title ? (
            <section className="mt-5">
              <h4 className="mb-2 text-sm font-semibold text-slate-800">Full Protocol</h4>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                {safe(trial.protocol)}
              </div>
            </section>
          ) : null}

          <section className="mt-5">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">Eligibility Criteria</h4>

            <details className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Inclusion Criteria
              </summary>
              <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {inclusionText || "Not available for this trial in the current data file."}
              </div>
            </details>

            <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Exclusion Criteria
              </summary>
              <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {exclusionText || "Not available for this trial in the current data file."}
              </div>
            </details>
          </section>

          {Array.isArray(trial.keywords) && trial.keywords.length > 0 ? (
            <section className="mt-5">
              <h4 className="mb-3 text-sm font-semibold text-slate-800">Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {trial.keywords.slice(0, 10).map((kw, idx) => (
                  <span
                    key={`${kw}-${idx}`}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {ctgovLink ? (
              <a
                href={ctgovLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
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
    <div className="rounded-xl border border-white bg-white p-3 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
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
function extractDrugBadges(trial) {
  const source = `${safe(trial.title)} ${safe(trial.protocol)}`.toLowerCase();

  const drugDictionary = [
    "pembrolizumab",
    "nivolumab",
    "durvalumab",
    "atezolizumab",
    "ipilimumab",
    "cemiplimab",
    "fianlimab",
    "rilvegostomig",
    "trastuzumab",
    "trastuzumab deruxtecan",
    "deruxtecan",
    "enhertu",
    "fluoropyrimidine",
    "gemcitabine",
    "cisplatin",
    "oxaliplatin",
    "irinotecan",
    "folfiri",
    "folfox",
    "paclitaxel",
    "docetaxel",
    "carboplatin",
    "bevacizumab",
    "ramucirumab",
    "panitumumab",
    "cetuximab",
    "sotorasib",
    "inavolisib",
    "giredestrant",
    "fulvestrant",
    "ribociclib",
    "abemaciclib",
    "alpelisib",
    "elacestrant",
    "gedatolisib",
    "camizestrant",
    "palazestrant",
    "venetoclax",
    "blinatumomab",
    "letrozole",
    "exemestane",
    "goserelin",
    "doxorubicin",
    "capecitabine",
  ];

  const matches = drugDictionary.filter((drug) => source.includes(drug));

  return [...new Set(matches)].slice(0, 4);
}
function getMatchReasons(trial, screening) {
  const reasons = [];

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

  if (screening.dst && trial.dst === screening.dst) {
    reasons.push(`Disease site matched: ${trial.dst}`);
  }

  if (screening.diagnosis) {
    const diagnosisWords = screening.diagnosis
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const matchedDiagnosisWords = diagnosisWords.filter((word) =>
      haystack.includes(word)
    );

    if (matchedDiagnosisWords.length > 0) {
      reasons.push(`Diagnosis matched: ${matchedDiagnosisWords.join(", ")}`);
    }
  }

  if (screening.biomarker) {
    const biomarkerWords = screening.biomarker
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const matchedBiomarkerWords = biomarkerWords.filter((word) =>
      haystack.includes(word)
    );

    if (matchedBiomarkerWords.length > 0) {
      reasons.push(`Biomarker matched: ${matchedBiomarkerWords.join(", ")}`);
    }
  }

  if (screening.priorTherapy) {
    const therapyWords = screening.priorTherapy
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const matchedTherapyWords = therapyWords.filter((word) =>
      haystack.includes(word)
    );

    if (matchedTherapyWords.length > 0) {
      reasons.push(`Prior therapy matched: ${matchedTherapyWords.join(", ")}`);
    }
  }

  if (screening.age && ageMatches(trial, screening.age)) {
    reasons.push(`Age appears compatible: ${screening.age}`);
  }

  if (screening.sex && sexMatches(trial, screening.sex)) {
    reasons.push(`Sex appears compatible: ${screening.sex}`);
  }

  return reasons;
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200";