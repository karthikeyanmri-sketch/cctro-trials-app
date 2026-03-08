import fs from "fs/promises";
import path from "path";

const INPUT = path.resolve("src/data/cctro_trials_flat.json");
const OUTPUT = path.resolve("src/data/cctro_trials_flat_enriched.json");

function safe(v) {
  return v == null ? "" : String(v).trim();
}

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function normalizePhase(phases) {
  if (!Array.isArray(phases) || phases.length === 0) return "";
  return phases.join(", ");
}

function pickTitle(study) {
  return (
    safe(study?.protocolSection?.identificationModule?.briefTitle) ||
    safe(study?.protocolSection?.identificationModule?.officialTitle)
  );
}

function pickProtocol(study) {
  return (
    safe(study?.protocolSection?.identificationModule?.officialTitle) ||
    safe(study?.protocolSection?.identificationModule?.briefTitle)
  );
}

function pickSponsor(study) {
  return safe(
    study?.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name
  );
}

function mapStatus(status) {
  const s = safe(status).toUpperCase();

  if (s === "RECRUITING") return "Open to Accrual";
  if (s === "NOT_YET_RECRUITING") return "Pending Activation";
  if (s === "ACTIVE_NOT_RECRUITING") return "Active, Closed to Accrual";
  if (s === "COMPLETED") return "Closed";
  if (s === "TERMINATED") return "Closed";
  if (s === "WITHDRAWN") return "Closed";

  return safe(status) || "Open to Accrual";
}

function pickStatus(study) {
  return safe(study?.protocolSection?.statusModule?.overallStatus);
}

function pickLastUpdated(study) {
  return (
    safe(study?.protocolSection?.statusModule?.lastUpdatePostDateStruct?.date) ||
    safe(study?.protocolSection?.statusModule?.lastUpdatePostDate) ||
    ""
  );
}

function pickPhase(study) {
  const phases = study?.protocolSection?.designModule?.phases;
  return normalizePhase(phases);
}

function pickKeywords(study) {
  const conditions = study?.protocolSection?.conditionsModule?.conditions || [];
  const keywords = study?.protocolSection?.conditionsModule?.keywords || [];
  const interventions =
    study?.protocolSection?.armsInterventionsModule?.interventions?.map(
      (i) => i?.name
    ) || [];

  return uniq([
    ...conditions.map(safe),
    ...keywords.map(safe),
    ...interventions.map(safe),
  ]);
}

function pickEligibility(study) {
  const em = study?.protocolSection?.eligibilityModule || {};
  return {
    eligibilityCriteria: safe(em?.eligibilityCriteria),
    sex: safe(em?.sex),
    minimumAge: safe(em?.minimumAge),
    maximumAge: safe(em?.maximumAge),
    healthyVolunteers: safe(em?.healthyVolunteers),
  };
}

function ctgovLink(nct) {
  return `https://clinicaltrials.gov/study/${nct}`;
}

async function fetchStudy(nct) {
  const url = `https://clinicaltrials.gov/api/v2/studies/${encodeURIComponent(nct)}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${nct}`);
  }

  return await res.json();
}

function mergeTrial(localTrial, study) {
  const nct = safe(localTrial.nct);
  const eligibility = pickEligibility(study);

  return {
    ...localTrial,
    title: pickTitle(study) || localTrial.title,
    protocol: pickProtocol(study) || localTrial.protocol,
    status: mapStatus(pickStatus(study)) || localTrial.status || "Open to Accrual",
    phase: pickPhase(study) || localTrial.phase || "",
    sponsor: pickSponsor(study) || localTrial.sponsor || "",
    lastUpdated: pickLastUpdated(study) || localTrial.lastUpdated || "",
    keywords: uniq([...(localTrial.keywords || []), ...pickKeywords(study)]),
    link: ctgovLink(nct),
    eligibility:
      eligibility.eligibilityCriteria || eligibility.sex || eligibility.minimumAge
        ? eligibility
        : localTrial.eligibility,
  };
}

async function main() {
  const raw = await fs.readFile(INPUT, "utf8");
  const trials = JSON.parse(raw);

  if (!Array.isArray(trials)) {
    throw new Error("Input JSON must be an array");
  }

  const enriched = [];
  const errors = [];

  for (const trial of trials) {
    const nct = safe(trial.nct);

    if (!nct) {
      enriched.push(trial);
      continue;
    }

    try {
      console.log(`Syncing ${nct} ...`);
      const study = await fetchStudy(nct);
      enriched.push(mergeTrial(trial, study));
    } catch (err) {
      console.error(`Failed ${nct}: ${err.message}`);
      errors.push({ nct, error: err.message });
      enriched.push({
        ...trial,
        link: ctgovLink(nct),
      });
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  await fs.writeFile(OUTPUT, JSON.stringify(enriched, null, 2), "utf8");

  if (errors.length) {
    await fs.writeFile(
      path.resolve("sync-errors.json"),
      JSON.stringify(errors, null, 2),
      "utf8"
    );
  }

  console.log(`Done. Wrote ${OUTPUT}`);
  if (errors.length) {
    console.log("Some trials failed. See sync-errors.json");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});