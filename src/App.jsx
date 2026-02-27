import TRIALS_RAW from "./data/cctro_trials_flat.json";
import { DISEASE_SITES } from "./data/disease_sites";
import { matchesTrial, groupBy, safe, normalizeTrials } from "./lib/trials";
import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Plus,
  X,
  ChevronDown,
  ExternalLink,
  ClipboardList,
  Building2,
  Users,
  Calendar,
  Tag,
} from "lucide-react";
// Premium UI helpers
const DST_STYLES = {
  GU:   { label: "Genitourinary",   banner: "from-emerald-500 to-teal-500",   chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  TOC:  { label: "Thoracic",        banner: "from-sky-500 to-indigo-500",    chip: "bg-sky-50 text-sky-700 border-sky-200" },
  HN:   { label: "Head & Neck",     banner: "from-fuchsia-500 to-pink-500",  chip: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200" },
  NEURO:{ label: "Neuro/Brain",     banner: "from-violet-500 to-purple-500", chip: "bg-violet-50 text-violet-700 border-violet-200" },
  GI:   { label: "GI",              banner: "from-amber-500 to-orange-500",  chip: "bg-amber-50 text-amber-700 border-amber-200" },
  BREAST:{label:"Breast",           banner: "from-rose-500 to-red-500",      chip: "bg-rose-50 text-rose-700 border-rose-200" },
};

function dstStyle(dst) {
  return DST_STYLES[dst] || { label: dst || "DST", banner: "from-slate-600 to-slate-800", chip: "bg-slate-50 text-slate-700 border-slate-200" };
}
// If you're using shadcn/ui in your project, you can swap these for shadcn components.
const Card = ({ children, className = "" }) => (
  <div
    className={`rounded-2xl bg-white/80 backdrop-blur border border-slate-200 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const Button = ({ children, className = "", variant = "default", ...props }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none";
  const styles =
    variant === "ghost"
      ? "bg-transparent hover:bg-slate-100 text-slate-700"
      : variant === "outline"
      ? "bg-white hover:bg-slate-50 border border-slate-200 text-slate-800"
      : "bg-slate-900 hover:bg-slate-800 text-white";
  return (
    <button className={`${base} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Input = ({ className = "", ...props }) => (
  <input
    className={`w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300 ${className}`}
    {...props}
  />
);

const Badge = ({ children, className = "" }) => (
  <span
    className={`inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 ${className}`}
  >
    {children}
  </span>
);

/**
 * CCTRO Clinical Trials Directory
 * Hierarchy:
 *   DST -> Disease area -> Indication group -> Trials
 *
 * UX requirement:
 * - When browsing within a disease site (DST), list ONLY Trial IDs.
 * - Clicking a Trial ID opens full trial details (title, protocol, etc.).
 *
 * Replace SAMPLE_TRIALS with your live data source later.
 */


// Trial status options used across DSTs.
const STATUS = [
  "Open",
  "Suspended",
  "Not Open to Accrual",
  "Open to Accrual",
  "In Startup",
  "Closed to Accrual",
  "On Hold",
];

// NOTE: This dataset is sourced from the uploaded DST Word files.
// Replace/extend with your live data source later.
const SAMPLE_TRIALS = [
  // =====================
  // GU
  // =====================
  // Bladder
  {
    id: "EG70-101",
    nct: "NCT04752722",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "NMIBC",
    title:
      "Study of EG-70 as an Intravesical Administration to Patients with BCG-Unresponsive NMIBC and High-Risk NMIBC Patients who are BCG Naïve or Received Incomplete BCG Treatment",
    protocol: "EG70-101",
    status: "Suspended",
    notes: "NCT04752722; suspended",
    lastUpdated: "2026-02-13",
  },
  {
    id: "NP-G2-044-P2-01",
    nct: "NCT05023486",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "NMIBC",
    title:
      "NP-G2-044 as Monotherapy and Combination Therapy in Patients with Advanced or Metastatic Solid Tumor Malignancies",
    protocol: "NP-G2-044-P2-01",
    status: "Open to Accrual",
    notes: "NMIBC—BCG-unresponsive criteria",
    lastUpdated: "2026-02-13",
  },
  {
    id: "MODERN / A032103",
    nct: "NCT05987241",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "MIBC",
    title:
      "An Integrated Phase 2/3 And Phase 3 Trial of MRD-Based Optimization of Adjuvant Therapy in Urothelial Cancer",
    protocol: "A032103",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "BO45230",
    nct: "NCT06534983",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "MIBC",
    title:
      "Double-blind study evaluating Autogene Cevumeran + Nivolumab vs Nivolumab in high-risk MIBC",
    protocol: "BO45230",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "NRG-GU015",
    nct: "NCT07097142",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "MIBC",
    title:
      "Phase III Adaptive Radiation and Chemotherapy for Muscle Invasive Bladder Cancer",
    protocol: "NRG-GU015",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "RC48G001",
    nct: "NCT04879329",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "Metastatic 1st line",
    title:
      "Disitamab Vedotin for HER2-expressing locally advanced, unresectable, or metastatic urothelial carcinoma",
    protocol: "RC48G001",
    status: "Open to Accrual",
    notes: "Metastatic—1st/2nd line",
    lastUpdated: "2026-02-13",
  },
  {
    id: "SWOG 1937",
    nct: "NCT04579224",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "Eribulin ± Gemcitabine vs SOC for metastatic urothelial carcinoma refractory to or ineligible for anti-PD1/PD-L1",
    protocol: "SWOG 1937",
    status: "Open to Accrual",
    notes: "Metastatic—2nd line and beyond; feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "XL092-002",
    nct: "NCT05176483",
    dst: "GU",
    disease: "Bladder",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "Dose-escalation/expansion of XL092 in combination with immuno-oncology agents in advanced/metastatic solid tumors",
    protocol: "XL092-002",
    status: "Not Open to Accrual",
    notes: "UC, post EV + ICI (listed under Bladder Metastatic 2nd line+)",
    lastUpdated: "2026-02-13",
  },

  // Kidney
  {
    id: "S1931",
    nct: "NCT04510597",
    dst: "GU",
    disease: "Kidney",
    indicationGroup: "Metastatic 1st line",
    title:
      "Immunotherapy-based combination therapy with or without cytoreductive nephrectomy for metastatic RCC",
    protocol: "S1931",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "ARC-20",
    nct: "NCT05536141",
    dst: "GU",
    disease: "Kidney",
    indicationGroup: "Metastatic 1st line",
    title:
      "Dose expansion study of AB521 monotherapy and combinations in clear cell RCC",
    protocol: "ARC-20",
    status: "Suspended",
    lastUpdated: "2026-02-13",
  },
  {
    id: "XL092-002",
    nct: "NCT05176483",
    dst: "GU",
    disease: "Kidney",
    indicationGroup: "Metastatic 1st line",
    title:
      "Dose-escalation/expansion of XL092 in combination with immuno-oncology agents in advanced/metastatic solid tumors",
    protocol: "XL092-002",
    status: "Not Open to Accrual",
    notes: "Listed under Kidney 1st-line metastatic",
    lastUpdated: "2026-02-13",
  },
  {
    id: "KO-2806-001",
    nct: "NCT06026410",
    dst: "GU",
    disease: "Kidney",
    indicationGroup: "Metastatic 3rd line+",
    title:
      "First-in-human KO-2806 monotherapy/combination in advanced solid tumors",
    protocol: "KO-2806-001",
    status: "Open to Accrual",
    notes: "ccRCC, cabo-naive, 3rd/4th line",
    lastUpdated: "2026-02-13",
  },
  {
    id: "EGFR-008-001 (Janx008)",
    nct: "NCT05783622",
    dst: "GU",
    disease: "Kidney",
    indicationGroup: "Metastatic 3rd line+",
    title:
      "Study of Janx008 in subjects with advanced or metastatic solid tumor malignancies",
    protocol: "EGFR-008-001",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "TNG462",
    nct: "NCT05732831",
    dst: "GU",
    disease: "Kidney",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "TNG462 in participants with MTAP-deleted advanced or metastatic solid tumors",
    protocol: "TNG462",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "SRP-22C102 (ADU-1805)",
    nct: "NCT05856981",
    dst: "GU",
    disease: "Kidney",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "Study evaluating safety and pharmacokinetics of ADU-1805 in adults with advanced solid tumors",
    protocol: "SRP-22C102",
    status: "Open to Accrual",
    notes:
      "Advanced disease / PD-1 relapsed-refractory RCC (grouped under Kidney metastatic 2nd line+)",
    lastUpdated: "2026-02-13",
  },

  // Prostate
  {
    id: "IMPRINT / HFH-23-01",
    nct: "NCT05958082",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Genetic testing",
    title: "Pilot study to improve germline testing in at-risk patients with prostate cancer",
    protocol: "HFH-23-01",
    status: "Open to Accrual",
    notes:
      "Recurrent non-metastatic—genetic testing study; feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "ASCERTAIN / D9721C00002",
    nct: "NCT05938270",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Localized",
    title:
      "Biological effects of AZD5305, darolutamide, and combination prior to radical prostatectomy",
    protocol: "D9721C00002",
    status: "Open to Accrual",
    notes: "Localized—surgery",
    lastUpdated: "2026-02-13",
  },
  {
    id: "NRG-GU010",
    nct: "NCT05050084",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Localized",
    title:
      "Genomic risk stratified unfavorable intermediate-risk prostate cancer (parallel phase III randomized trials)",
    protocol: "NRG-GU010",
    status: "Open to Accrual",
    notes: "Localized—radiation",
    lastUpdated: "2026-02-13",
  },
  {
    id: "SWOG 1802",
    nct: "NCT03678025",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Metastatic 1st line",
    title:
      "SST vs SST + definitive treatment (surgery/radiation) of primary tumor in metastatic prostate cancer",
    protocol: "SWOG 1802",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "TRIPLE SWITCH / CCTG-PR26",
    nct: "NCT06592924",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Metastatic 1st line",
    title:
      "Docetaxel addition to AR pathway inhibitors in mCSPC with suboptimal PSA response",
    protocol: "CCTG-PR26",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "AMG 509 20230005",
    nct: "NCT06691984",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "Xaluritamig vs cabazitaxel or second AR-directed therapy in mCRPC previously treated with chemotherapy",
    protocol: "20230005",
    status: "Open to Accrual",
    notes: "Metastatic—3rd line (ARSI)",
    lastUpdated: "2026-02-13",
  },
  {
    id: "MK-5684-004",
    nct: "NCT06136650",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "MK-5684 vs alternative abiraterone or enzalutamide after progression on one next-gen hormonal agent",
    protocol: "MK-5684-004",
    status: "Open to Accrual",
    notes: "Metastatic—3rd line (2nd ARSI)",
    lastUpdated: "2026-02-13",
  },
  {
    id: "MK-2400-001",
    nct: "NCT06925737",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Metastatic 2nd line+",
    title: "Ifinatamab Deruxtecan vs docetaxel in mCRPC",
    protocol: "MK-2400-001",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "S2312",
    nct: "NCT06470243",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "Cabazitaxel ± carboplatin in mCRPC stratified by aggressive variant signature",
    protocol: "S2312",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "KLK2-comPAS",
    nct: "NCT07164443",
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Metastatic 2nd line+",
    title:
      "Pasritamig + best supportive care vs best supportive care for metastatic castration-resistant prostate cancer",
    protocol: "KLK2-comPAS",
    status: "Open to Accrual",
    notes: "Metastatic > 3rd line",
    lastUpdated: "2026-02-13",
  },

  // Rare tumors
  {
    id: "ICONIC / A031702",
    nct: "NCT03866382",
    dst: "GU",
    disease: "Rare tumors",
    indicationGroup: "Rare diseases",
    title: "Ipilimumab + cabozantinib + nivolumab in rare genitourinary cancers",
    protocol: "A031702",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "S2012",
    nct: "NCT05058651",
    dst: "GU",
    disease: "Rare tumors",
    indicationGroup: "Rare diseases",
    title:
      "First-line platinum/etoposide ± atezolizumab in poorly differentiated extrapulmonary small cell neuroendocrine carcinomas",
    protocol: "S2012",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },

  // =====================
  // TOC (Thoracic)
  // =====================
  // NSCLC
  
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "1st Line Metastatic",
    indication: "No driver mutation",
    id: "EDGE-LUNG",
    nct: "NCT05676931",
    title:
      "A Phase II, Open-label, Platform Study, to Evaluate Immunotherapy-based Combinations in Participants With Advanced Non-Small Cell Lung Cance",
    protocol: "EDGE-LUNG",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT05676931",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "1st Line Metastatic",
    indication: "EGFR and/or HER2",
    id: "BH-30643-01",
    nct: "NCT06706076",
    title:
      "A Phase 1/2 Open-Label, Multicenter, First-in-Human Study of the Safety, Tolerability, Pharmacokinetics, and Antitumor Activity of BH-30643 in Adult Subjects with Locally Advanced or Metastatic NSCLC Harboring EGFR  and/or HER2 Mutations (SOLARA)",
    protocol: "BH-30643-01",
    status: "Suspended",
    link: "https://clinicaltrials.gov/study/NCT06706076",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "1st Line Metastatic",
    indication: "RAS mutation",
    id: "RMC-LUNG-101",
    nct: "NCT06162221",
    title:
      "A Platform Study of RAS(ON) Inhibitor Combinations in Patients with RAS-Mutated Non-Small Cell Lung Cancer (NSCLC).",
    protocol: "RMC-LUNG-101",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06162221",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "1st Line Metastatic",
    indication: "PD-L1 (TC ≥ 1%)",
    id: "D702BC00001",
    nct: "NCT06692738",
    title:
      "A Phase III, Randomized, Double-blind, Multicenter, Global Study of Rilvegostomig in Combination with Platinum-based Chemotherapy for the First-line Treatment of Patients with Metastatic Squamous Non-small Cell Lung Cancer Whose Tumors Express PD-L1 (ARETMIDE-Lung-02)",
    protocol: "D702BC00001",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06692738",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "1st Line Metastatic",
    indication: "TPS ≥ 50%",
    id: "SPLFIO-174",
    nct: "NCT06162572",
    title:
      "A Phase 1b/2, multicenter, open-label platform study of select immunotherapy combinations in adult participants with previously untreated advanced non-small cell lung cancer (NSCLC) with high PD-L1 expression",
    protocol: "SPLFIO-174",
    status: "Suspended",
    link: "https://clinicaltrials.gov/study/NCT06162572",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "1st Line Metastatic",
    indication: "TPS ≥ 50%",
    id: "SMT112-3007/ HARMONi-7",
    nct: "NCT06767514",
    title:
      "A Randomized, Double-blinded, Multiregional Phase 3 Study of Ivonescimab Versus Pembrolizumab for the First-line Treatment of Metastatic Non-small Cell Lung Cancer in Patients Whose Tumors Demonstrate High PD-L1 Expression (TPS ≥ 50%)",
    protocol: "SMT112-3007/ HARMONi-7",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06767514",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "1st Line Metastatic",
    indication: "Adeno and Squamous",
    id: "SMT112-3003/ HARMONi-3",
    nct: "NCT05899608",
    title:
      "A Randomized, Double-blind, Multiregional Phase 3 Study of Ivonescimab Combined with Chemotherapy Versus Pembrolizumab Combined with Chemotherapy for the First-line Treatment of Metastatic Squamous Nonsmall Cell Lung Cancer (HARMONi-3)",
    protocol: "SMT112-3003/ HARMONi-3",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT05899608",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "2nd Line and Beyond",
    indication: "MET amplification",
    id: "S1900J",
    nct: "NCT06116682",
    title:
      "A Phase II Study of Amivantamab SC (subcutaneous) in Participants with MET Amplification-Positive Stage IV or Recurrent Non-Small Cell Lung Cancer (Lung-MAP Sub-Study).",
    protocol: "S1900J",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06116682",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "2nd Line and Beyond",
    indication: "No driver mutation",
    id: "BNT326-02",
    nct: "NCT07111520",
    title:
      "A Phase Ib/II, multi-site, open-label, dose finding trial to evaluate the safety, efficacy, and pharmacokinetics of BNT326 in combination with BNT327 in participants with advanced non-small cell lung cancer (NSCLC)",
    protocol: "BNT326-02",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT07111520",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "2nd Line and Beyond",
    indication: "Advanced ALK",
    id: "NVL-655-EAP",
    nct: "NCT06834074",
    title:
      "Expanded Access Treatment of Neladalkib (NVL-655) in Patients with Advanced ALK + NSCLC",
    protocol: "NVL-655-EAP",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06834074",
  },
  {
    dst: "TOC",
    disease: "NSCLC",
    indicationGroup: "2nd Line and Beyond",
    indication: "RAS[MUT]",
    id: "RMC-6236-301",
    nct: "NCT06881784",
    title:
      "A Phase 3 Multicenter, Open Label, Randomized Study of RMC-6236 versus Docetaxel in Patients with Previously Treated Locally Advanced or Metastatic RAS[MUT] NSCLC  (RASolve 301)",
    protocol: "RMC-6236-301",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06881784",
  },
  {
    dst: "TOC",
    disease: "SCLC",
    indicationGroup: "1st Line Metastatic",
    id: "HFH-C-2025-02",
    nct: "NCT07339059",
    title:
      "A Phase II study of Sacituzumab govitecan with Atezolizumab/Durvalumab as maintenance therapy for Extensive stage small cell lung cancer",
    protocol: "HFH-C-2025-02",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT07339059",
  },
  {
    dst: "TOC",
    disease: "SCLC",
    indicationGroup: "2nd Line and Beyond",
    indication: "No driver mutation",
    id: "PUMA-ALI-4201",
    nct: "NCT06095505",
    title:
      "A Phase 2 Study Of Alisertib In Patients With Extensive Stage Small Cell Lung Cancer",
    protocol: "PUMA-ALI-4201",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06095505",
  },

  // =====================
  // Neuro/Brain (NB)
  // =====================
  {
    dst: "NEURO",
    disease: "Neuro/Brain",
    indicationGroup: "Radiation trials",
    indication: "SRS vs FSRS for Intact Brain Metastases",
    id: "NRG-BN013*",
    nct: "NCT06500455",
    title:
      "(Dr. Walker): Phase III Trial of Single Fraction Stereotactic Radiosurgery (SRS) Versus Fractionated SRS (FSRS) for Intact Brain Metastases",
    protocol: "NRG-BN013*",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT06500455",
  },
  {
    dst: "NEURO",
    disease: "Neuro/Brain",
    indicationGroup: "Radiation trials",
    indication: "Observation vs Irradiation - Gross Totally Resected Grade II Meningioma",
    id: "NRG-BN003*",
    nct: "NCT03180268",
    title:
      "(Dr. Walker): Phase III Trial of Observation Versus Irradiation for a Gross Totally Resected Grade II Meningioma",
    protocol: "NRG-BN003*",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT03180268",
  },
  {
    dst: "NEURO",
    disease: "Neuro/Brain",
    indicationGroup: "Therapeutic trials",
    indication: "Glioblastoma",
    id: "NRG-BN011",
    nct: "NCT05600090",
    title:
      "A Phase II/III Trial of Lomustine-Temozolomide Combination Therapy Versus Standard Temozolomide Therapy in Patients With Newly Diagnosed MGMT Promoter Methylated Glioblastoma",
    protocol: "NRG-BN011",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT05600090",
  },
  {
    dst: "NEURO",
    disease: "Neuro/Brain",
    indicationGroup: "Therapeutic trials",
    indication: "Recurrent Glioblastoma",
    id: "NRG-BN007",
    nct: "NCT03430791",
    title:
      "Phase II Trial of Ipilimumab and Nivolumab Compared With Nivolumab Alone in Patients With Recurrent Glioblastoma",
    protocol: "NRG-BN007",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT03430791",
  },
  {
    dst: "NEURO",
    disease: "Neuro/Brain",
    indicationGroup: "Therapeutic trials",
    indication: "Melanoma Brain Mets",
    id: "MDACC 2018-0440",
    nct: "NCT03898908",
    title:
      "A Phase II Trial of ATRC-101 and Pembrolizumab in Patients With Advanced Solid Tumors (Includes melanoma with brain metastases cohort)",
    protocol: "MDACC 2018-0440",
    status: "Open",
    link: "https://clinicaltrials.gov/study/NCT03898908",
  },

  // =====================
  // Head & Neck (HN)
  // =====================
  {
    id: "CCTG-HN11",
    dst: "HN",
    disease: "Localized",
    indicationGroup: "Oropharyngeal",
    title: "Lateralized oropharyngeal cancer",
    protocol: "CCTG-HN11",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "MGT-AQP1-201",
    dst: "HN",
    disease: "Adjuvant",
    indicationGroup: "Supportive care",
    title: "Radiation-induced late xerostomia",
    protocol: "MGT-AQP1-201",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "RTOG-1216",
    dst: "HN",
    disease: "Adjuvant",
    indicationGroup: "Squamous cell carcinoma",
    title:
      "Cisplatin vs docetaxel vs docetaxel + cetuximab in high-risk squamous cell cancer",
    protocol: "RTOG-1216",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "EA-3132",
    dst: "HN",
    disease: "Adjuvant",
    indicationGroup: "Squamous cell carcinoma",
    title:
      "Radiotherapy with or without cisplatin in surgically resected squamous cell carcinoma",
    protocol: "EA-3132",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  {
    id: "NRG_HN014",
    dst: "HN",
    disease: "Adjuvant",
    indicationGroup: "Cutaneous SCC",
    title:
      "Neoadjuvant immunotherapy vs SOC for resectable stage III/IV cutaneous squamous cell carcinoma",
    protocol: "NRG_HN014",
    status: "Open to Accrual",
    lastUpdated: "2026-02-13",
  },
  {
    id: "NRG-HN006",
    dst: "HN",
    disease: "Surgical",
    indicationGroup: "Oral cavity",
    title: "Early-stage oral cavity cancer",
    protocol: "NRG-HN006",
    status: "Open to Accrual",
    notes: "Feasible at satellite locations",
    lastUpdated: "2026-02-13",
  },
  // =====================
// Sarcoma (SAR)
// =====================
{
  id: "EA7222",
  nct: "NCT06422806",
  dst: "SAR",
  disease: "Sarcoma",
  indicationGroup: "UPS / Poorly differentiated sarcomas",
  title:
    "EA7222: Doxorubicin + Pembrolizumab vs Doxorubicin alone for UPS and related poorly differentiated sarcomas",
  protocol: "EA7222",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},
{
  id: "AOST2032",
  nct: "NCT05691478",
  dst: "SAR",
  disease: "Sarcoma",
  indicationGroup: "Newly Diagnosed Osteosarcoma",
  title:
    "AOST2032: Cabozantinib + chemotherapy for newly diagnosed osteosarcoma",
  protocol: "AOST2032",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},

// =====================
// Melanoma (MEL)
// =====================
{
  id: "IOV-MEL-301",
  nct: "NCT05727904",
  dst: "MEL",
  disease: "Melanoma",
  indicationGroup: "Metastatic • First Line",
  title:
    "IOV-MEL-301: lifileucel (TIL) + pembrolizumab vs pembrolizumab in previously untreated unresectable/metastatic melanoma",
  protocol: "IOV-MEL-301",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},
{
  id: "IMC-F106C-301",
  nct: "NCT06112314",
  dst: "MEL",
  disease: "Melanoma",
  indicationGroup: "Advanced • 1L",
  title:
    "IMC-F106C + nivolumab vs nivolumab regimens in HLA-A*02:01+ advanced melanoma (PRISM-MEL-301)",
  protocol: "IMC-F106C-301",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},
{
  id: "RP1-104",
  nct: "NCT06264180",
  dst: "MEL",
  disease: "Melanoma",
  indicationGroup: "Advanced • Post PD-1/CTLA-4",
  title:
    "RP1-104: vusolimogene oderparepvec + nivolumab vs physician’s choice in advanced melanoma after anti-PD-1 and anti-CTLA-4 (IGNYTE-3)",
  protocol: "RP1-104",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},
{
  id: "R3767-onc-22122",
  nct: "NCT06246916",
  dst: "MEL",
  disease: "Melanoma",
  indicationGroup: "Unresectable/Metastatic",
  title:
    "R3767-onc-22122: fianlimab+c emiplimab vs nivolumab+relatlimab in unresectable or metastatic melanoma",
  protocol: "R3767-onc-22122",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},
{
  id: "SN2426/HN013",
  nct: "NCT07042295",
  dst: "MEL",
  disease: "Melanoma",
  indicationGroup: "Cutaneous SCC (listed under MEL in your file)",
  title:
    "SN2426/HN013: amivantamab + hyaluronidase vs cetuximab in immunocompromised recurrent inoperable/metastatic cutaneous SCC",
  protocol: "SN2426/HN013",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},
{
  id: "R3767-ONC-2466",
  nct: "NCT06848088",
  dst: "MEL",
  disease: "Melanoma",
  indicationGroup: "Extended follow-up",
  title:
    "R3767-ONC-2466: extended follow-up of melanoma patients treated with fianlimab + cemiplimab",
  protocol: "R3767-ONC-2466",
  status: "Open to Accrual",
  lastUpdated: "2026-02-25",
},
];

function toSiteLabel(siteId) {
  return DISEASE_SITES.find((s) => s.id === siteId)?.label ?? siteId;
}


function PillSelect({ label, value, options, onChange, icon: Icon }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-left text-sm text-slate-800 hover:bg-white"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4 text-slate-500" /> : null}
            <span className="text-slate-500">{label}:</span>
            <span className="font-medium">{value || "All"}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-slate-500" />
        </div>
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
            >
              All
            </button>
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
              >
                {opt}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl bg-white shadow-xl border border-slate-200"
          >
<div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white">
                <div className="text-base font-semibold text-slate-900">
                {title}
              </div>
              <Button variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
                Close
              </Button>
            </div>
            <div className="p-5 max-h-[75vh] overflow-y-auto">
  {children}
</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
function TrialDetail({ trial, ct, loading, error }) {
  return (
    <div className="space-y-3">
          {(() => {
      const s = dstStyle(trial.dst);
      return (
        <div className={`rounded-2xl bg-gradient-to-r ${s.banner} p-[1px]`}>
          <div className="rounded-2xl bg-white/70 backdrop-blur px-4 py-3 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500">Disease Site Team</div>
              <div className="text-sm font-semibold text-slate-900">
                {s.label} ({trial.dst})
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full border ${s.chip}`}>
              {trial.status || "—"}
            </span>
          </div>
        </div>
      );
    })()}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">
          {trial.id}
          {trial.nct ? ` (${trial.nct})` : ""}
        </span>
        <Badge>{toSiteLabel(trial.dst)}</Badge>
        <Badge className="border-slate-300">{trial.disease}</Badge>
        <Badge className="border-slate-300">{trial.indicationGroup}</Badge>
        <Badge className="border-slate-300">{trial.status}</Badge>
        {trial.indication ? (
          <Badge className="border-slate-300">{trial.indication}</Badge>
        ) : null}
      </div>

      <div className="text-xl font-semibold text-slate-900 leading-snug">
        {trial.title}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <ClipboardList className="h-4 w-4 text-slate-400" />
          Protocol: <span className="font-medium">{trial.protocol}</span>
        </span>
        {trial.pi ? (
          <span className="inline-flex items-center gap-1">
            <Users className="h-4 w-4 text-slate-400" /> PI: {trial.pi}
          </span>
        ) : null}
        {trial.sponsor ? (
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-4 w-4 text-slate-400" /> Sponsor:{" "}
            {trial.sponsor}
          </span>
        ) : null}
        {trial.lastUpdated ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4 text-slate-400" /> Updated:{" "}
            {trial.lastUpdated}
          </span>
        ) : null}
        {trial.phase ? (
          <span className="inline-flex items-center gap-1">
            <Tag className="h-4 w-4 text-slate-400" /> Phase: {trial.phase}
          </span>
        ) : null}
      </div>

      {trial.notes ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
          {trial.notes}
        </div>
      ) : null}

      {(trial.keywords ?? []).length ? (
        <div className="flex flex-wrap gap-2">
          {(trial.keywords ?? []).slice(0, 10).map((k) => (
            <Badge key={k} className="bg-slate-50">
              {k}
            </Badge>
          ))}
        </div>
      ) : null}

      {trial.link ? (
        <div>
          <Button
            variant="outline"
            onClick={() =>
              window.open(trial.link, "_blank", "noopener,noreferrer")
            }
          >
            <ExternalLink className="h-4 w-4" />
            Open external link
          </Button>
        </div>
      ) : null}

{/* --- ClinicalTrials.gov Enriched Details --- */}
{trial?.nct ? (
  <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4">
    {loading ? (
      <div className="text-sm text-slate-700">
        Loading ClinicalTrials.gov details…
      </div>
    ) : null}

    {error ? (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        {error}
      </div>
    ) : null}

    {ct ? (
      <>
        <div className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Official title:</span>{" "}
          {ct.officialTitle || "—"}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-sm">
            <div className="text-xs font-semibold text-slate-500">Phase</div>
            <div className="mt-1 text-slate-900">{ct.phase || "—"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-sm">
            <div className="text-xs font-semibold text-slate-500">Sponsor</div>
            <div className="mt-1 text-slate-900">{ct.sponsor || "—"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/60 p-3 text-sm">
            <div className="text-xs font-semibold text-slate-500">Status</div>
            <div className="mt-1 text-slate-900">{ct.overallStatus || "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CollapsibleSection title="Inclusion criteria" defaultOpen={false}>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-800 space-y-1 max-h-64 overflow-y-auto pr-2">
              {(ct?.inclusionCriteria || []).length
                ? ct.inclusionCriteria.map((x, i) => (
                    <li key={`inc-${i}`}>{x}</li>
                  ))
                : <li>—</li>}
            </ul>
          </CollapsibleSection>

          <CollapsibleSection title="Exclusion criteria" defaultOpen={false}>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-800 space-y-1 max-h-64 overflow-y-auto pr-2">
              {(ct?.exclusionCriteria || []).length
                ? ct.exclusionCriteria.map((x, i) => (
                    <li key={`exc-${i}`}>{x}</li>
                  ))
                : <li>—</li>}
            </ul>
          </CollapsibleSection>
        </div>
      </>
    ) : null}
  </div>
) : (
  <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
    NCT number not provided for this trial yet — add it to enable overview,
    protocol title, sponsor, phase, and inclusion/exclusion.
  </div>
)}
    </div>
  );
}
function TrialRow({ trial, onOpen }) {
  // Compact list row: show Trial ID + (optional) indication badge.
  return (
    <button
      type="button"
      onClick={() => onOpen(trial)}
      className="w-full text-left rounded-2xl border border-slate-200 bg-white/70 hover:bg-white px-4 py-3 transition"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{trial.id}</span>
          {trial.indication ? (
            <Badge className="bg-slate-50">{trial.indication}</Badge>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {trial.status ? <Badge className="bg-slate-50">{trial.status}</Badge> : null}
          <span className="text-xs text-slate-500">Details</span>
        </div>
      </div>
    </button>
  );
}

function TrialDetailModal({ open, onClose, trial, ct, loading, error }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={trial ? `Trial Details • ${trial.id}` : "Trial Details"}
    >
      {trial ? <TrialDetail trial={trial} ct={ct} loading={loading} error={error} /> : null}
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </Card>
  );
}

function AccordionDisease({ bucket, onOpenTrial }) {
  const [open, setOpen] = useState(true);
  return (
    <Card className="p-4">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="text-left">
          <div className="text-xs text-slate-500">Disease area</div>
          <div className="text-lg font-semibold text-slate-900">{bucket.disease}</div>
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 space-y-4"
          >
            {bucket.indications.map((ind) => (
              <div
                key={ind.indicationGroup}
                className="rounded-2xl border border-slate-200 bg-white/60 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-slate-500">Indication group</div>
                    <div className="text-base font-semibold text-slate-900">
                      {ind.indicationGroup}
                    </div>
                  </div>
                  <Badge>
                    {ind.trials.length} trial{ind.trials.length === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2">
                  {ind.trials.map((t) => (
                    <TrialRow
                      key={`${t.dst}-${t.disease}-${t.indicationGroup}-${t.id}`}
                      trial={t}
                      onOpen={onOpenTrial}
                    />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
async function fetchCtGovStudy(nct) {
  const url = `https://clinicaltrials.gov/api/v2/studies/${encodeURIComponent(nct)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ClinicalTrials.gov fetch failed (${res.status})`);
  return res.json();
}

function splitEligibilityToBullets(raw) {
  if (!raw || typeof raw !== "string") return { inclusion: [], exclusion: [], raw: "" };

  const text = raw.replace(/\r\n/g, "\n").trim();

  // Split on "Exclusion Criteria:" if present
  let inclusionBlock = text;
  let exclusionBlock = "";

  const parts = text.split(/exclusion\s*criteria\s*:/i);
  if (parts.length > 1) {
    inclusionBlock = parts[0];
    exclusionBlock = parts.slice(1).join("\n").trim();
  }

  inclusionBlock = inclusionBlock.replace(/inclusion\s*criteria\s*:/i, "").trim();

  const toBullets = (block) =>
    block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => l.replace(/^[-•*\d.()]+\s*/, "")) // strip bullets/numbering
      .filter(Boolean);

  return {
    inclusion: toBullets(inclusionBlock),
    exclusion: toBullets(exclusionBlock),
    raw: text,
  };
}

function mapCtGov(studyJson) {
  const ps = studyJson?.protocolSection || {};
  const idMod = ps?.identificationModule || {};
  const sponsorMod = ps?.sponsorCollaboratorsModule || {};
  const descMod = ps?.descriptionModule || {};
  const designMod = ps?.designModule || {};
  const eligMod = ps?.eligibilityModule || {};
  const contactsMod = ps?.contactsLocationsModule || {};

  const eligibilityText = eligMod?.eligibilityCriteria || "";
  const { inclusion, exclusion } = splitEligibilityToBullets(eligibilityText);

  const overallOfficials = contactsMod?.overallOfficials || [];
  const overallOfficial = overallOfficials?.[0];

  return {
    protocolTitle: idMod?.officialTitle || idMod?.briefTitle || "",
    nct: idMod?.nctId || "",
    sponsor: sponsorMod?.leadSponsor?.name || "",
    phase: Array.isArray(designMod?.phases) ? designMod.phases.join(", ") : (designMod?.phase || ""),
    overview: descMod?.briefSummary || "",
    principalInvestigator:
      overallOfficial?.name
        ? `${overallOfficial.name}${overallOfficial?.role ? ` (${overallOfficial.role})` : ""}`
        : "",
    inclusionCriteria: inclusion,
    exclusionCriteria: exclusion,
  };
}
export default function App() {
  // ✅ state first
  const [trials, setTrials] = useState(() => normalizeTrials(TRIALS_RAW));
  const [ctDetailsByNct, setCtDetailsByNct] = useState({});
  const [ctLoadingNct, setCtLoadingNct] = useState(null);
  const [ctError, setCtError] = useState(null);

  // ✅ then memos that depend on trials
  const activeSites = useMemo(() => {
    const present = new Set(trials.map((t) => t.dst));
    return DISEASE_SITES.filter((s) => present.has(s.id));
  }, [trials]);
  // Primary navigation
  const [dst, setDst] = useState("GU");

  // Filters/search
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [disease, setDisease] = useState("");

  // UI
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState("Grouped"); // Grouped | Flat

  // Trial details
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const dstTrials = useMemo(() => trials.filter((t) => t.dst === dst), [trials, dst]);

  const diseaseOptions = useMemo(() => {
    const set = new Set(dstTrials.map((t) => t.disease).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dstTrials]);

  const statusOptions = useMemo(() => {
    const set = new Set(dstTrials.map((t) => t.status).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [dstTrials]);

  const filtered = useMemo(() => {
    return dstTrials
      .filter((t) => (disease ? t.disease === disease : true))
      .filter((t) => (status ? t.status === status : true))
      .filter((t) => (query ? matchesTrial(t, query) : true))
      .sort((a, b) => (safe(a.lastUpdated) < safe(b.lastUpdated) ? 1 : -1));
  }, [dstTrials, disease, status, query]);

  const counts = useMemo(() => {
    const byDst = Object.fromEntries(trials.map((s) => [s.id, 0]));
    for (const t of trials) byDst[t.dst] = (byDst[t.dst] ?? 0) + 1;

    const byDisease = Object.fromEntries(diseaseOptions.map((d) => [d, 0]));
    for (const t of dstTrials) byDisease[t.disease] = (byDisease[t.disease] ?? 0) + 1;

    return {
      totalAll: trials.length,
      totalDst: dstTrials.length,
      openishDst: dstTrials.filter((t) => ["Open", "Open to Accrual"].includes(t.status)).length,
      byDst,
      byDisease,
    };
  }, [trials, dstTrials, diseaseOptions]);

  const grouped = useMemo(() => {
    const byDisease = groupBy(filtered, (t) => t.disease);
    const diseaseKeys = Array.from(byDisease.keys()).sort((a, b) => a.localeCompare(b));

    return diseaseKeys.map((d) => {
      const items = byDisease.get(d) ?? [];
      const byInd = groupBy(items, (t) => t.indicationGroup);
      const indKeys = Array.from(byInd.keys()).sort((a, b) => a.localeCompare(b));
      return {
        disease: d,
        indications: indKeys.map((k) => ({
          indicationGroup: k,
          trials: (byInd.get(k) ?? []).slice().sort((a, b) => safe(a.id).localeCompare(safe(b.id))),
        })),
      };
    });
  }, [filtered]);

  const openTrial = async (trial) => {
  setSelectedTrial(trial);
  setIsDetailOpen(true);

  if (!trial?.nct) return;
  if (ctDetailsByNct[trial.nct]) return;

  try {
    setCtError(null);
    setCtLoadingNct(trial.nct);
    const json = await fetchCtGovStudy(trial.nct);
    const mapped = mapCtGov(json);
    setCtDetailsByNct((prev) => ({ ...prev, [trial.nct]: mapped }));
  } catch (e) {
    setCtError(String(e?.message || e));
  } finally {
    setCtLoadingNct(null);
  }
};

  return (
<div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
  <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(16,185,129,0.10),transparent_55%)]" />
  <div className="relative">
    {/* your existing content */}
  </div>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-600">
              <span className="h-2 w-2 rounded-full bg-slate-900" />
              CCTRO • Clinical Trials Directory
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Available Clinical Trials
            </h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Browse trials by DST → disease area → indication group. Lists show Trial IDs only; click an ID for full details.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatus("");
                setDisease("");
              }}
            >
              <Filter className="h-4 w-4" />
              Clear filters
            </Button>
            <Button variant="outline" onClick={() => setViewMode((v) => (v === "Grouped" ? "Flat" : "Grouped"))}>
              {viewMode === "Grouped" ? "Grouped view" : "Flat view"}
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add trial
            </Button>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="All CCTRO trials (loaded)" value={counts.totalAll} />
          <Stat label={`${dst} trials (loaded)`} value={counts.totalDst} />
          <Stat label={`${dst} open to accrual`} value={counts.openishDst} />
          <Card className="p-4">
            <div className="text-xs text-slate-500">DST totals</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {DISEASE_SITES.map((s) => (
                <Badge key={s.id}>
                  {s.id}: {counts.byDst[s.id] ?? 0}
                </Badge>
              ))}
            </div>
          </Card>
        </section>

        {/* DST Tabs */}
        <section className="mt-6">
          <Card className="p-3">
            <div className="flex flex-wrap gap-2">
              {DISEASE_SITES.map((s) => {
                const active = s.id === dst;
                return (
                  <Button
                    key={s.id}
                    variant={active ? "default" : "outline"}
                    className={active ? "" : "bg-white"}
                    onClick={() => {
                      setDst(s.id);
                      setDisease("");
                      setStatus("");
                      setQuery("");
                    }}
                  >
                    {s.label}
                  </Button>
                );
              })}
            </div>
          </Card>
        </section>

        {/* Filters */}
        <section className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Card className="lg:col-span-12 p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by protocol, NCT, trial ID, indication…"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="md:col-span-3">
                <PillSelect
                  label="Disease area"
                  value={disease || "All"}
                  options={diseaseOptions}
                  onChange={setDisease}
                  icon={Filter}
                />
              </div>
              <div className="md:col-span-3">
                <PillSelect
                  label="Status"
                  value={status || "All"}
                  options={statusOptions}
                  onChange={setStatus}
                  icon={Filter}
                />
              </div>
            </div>

            {/* Disease quick chips */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDisease("")}
                className={`text-xs px-3 py-1 rounded-full border ${
                  disease === "" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              {diseaseOptions.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDisease(d)}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    disease === d ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {d} ({counts.byDisease[d] ?? 0})
                </button>
              ))}
            </div>
          </Card>

          <div className="lg:col-span-12">
            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{filtered.length}</span> of{" "}
                <span className="font-semibold text-slate-900">{dstTrials.length}</span> trials in{" "}
                <span className="font-semibold text-slate-900">{toSiteLabel(dst)}</span>
              </div>
            </div>

            {viewMode === "Flat" ? (
              <div className="mt-4 grid grid-cols-1 gap-2">
                <AnimatePresence>
                  {filtered.map((t) => (
                    <motion.div
                      key={`${t.dst}-${t.disease}-${t.indicationGroup}-${t.id}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                    >
                      <TrialRow trial={t} onOpen={openTrial} />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filtered.length === 0 ? (
                  <Card className="p-10 text-center">
                    <div className="text-lg font-semibold text-slate-900">No trials match your filters</div>
                    <div className="mt-2 text-slate-600">Try clearing filters or adjusting your search terms.</div>
                  </Card>
                ) : null}
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4">
                {grouped.map((bucket) => (
                  <AccordionDisease key={bucket.disease} bucket={bucket} onOpenTrial={openTrial} />
                ))}

                {grouped.length === 0 ? (
                  <Card className="p-10 text-center">
                    <div className="text-lg font-semibold text-slate-900">No trials match your filters</div>
                    <div className="mt-2 text-slate-600">Try clearing filters or adjusting your search terms.</div>
                  </Card>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <footer className="mt-10 text-xs text-slate-500">
          Current view is built from the uploaded DST Word files. Next steps: connect a live data source and add role-based access control.
        </footer>
      </div>

      <AddTrialModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={(newTrial) => setTrials((prev) => [newTrial, ...prev])}
      />

<TrialDetailModal
  open={isDetailOpen}
  onClose={() => setIsDetailOpen(false)}
  trial={selectedTrial}
  ct={selectedTrial?.nct ? ctDetailsByNct[selectedTrial.nct] : null}
  loading={selectedTrial?.nct ? ctLoadingNct === selectedTrial.nct : false}
  error={ctError}
/>

</div>
  );
}

function AddTrialModal({ open, onClose, onAdd }) {
  const [form, setForm] = useState({
    dst: "GU",
    disease: "Prostate",
    indicationGroup: "Localized",
    indication: "",
    id: "",
    nct: "",
    title: "",
    protocol: "",
    status: "Open to Accrual",
    phase: "",
    pi: "",
    sponsor: "",
    notes: "",
    keywords: "",
    link: "",
  });
  const [error, setError] = useState("");

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit() {
    setError("");
    if (!form.dst) return setError("DST is required.");
    if (!form.disease.trim()) return setError("Disease area is required.");
    if (!form.indicationGroup.trim()) return setError("Indication group is required.");
    if (!form.id.trim()) return setError("Trial ID is required.");
    if (!form.title.trim()) return setError("Title is required.");
    if (!form.protocol.trim()) return setError("Protocol is required.");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");

    onAdd({
      dst: form.dst,
      disease: form.disease.trim(),
      indicationGroup: form.indicationGroup.trim(),
      indication: form.indication.trim() || undefined,
      id: form.id.trim(),
      nct: form.nct.trim() || undefined,
      title: form.title.trim(),
      protocol: form.protocol.trim(),
      status: form.status,
      phase: form.phase.trim() || undefined,
      pi: form.pi.trim() || undefined,
      sponsor: form.sponsor.trim() || undefined,
      notes: form.notes.trim() || undefined,
      keywords: form.keywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      lastUpdated: `${yyyy}-${mm}-${dd}`,
      link: form.link.trim() || undefined,
    });

    setForm({
      dst: "GU",
      disease: "Prostate",
      indicationGroup: "Localized",
      indication: "",
      id: "",
      nct: "",
      title: "",
      protocol: "",
      status: "Open to Accrual",
      phase: "",
      pi: "",
      sponsor: "",
      notes: "",
      keywords: "",
      link: "",
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a clinical trial">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="text-sm">
          <div className="text-slate-600 mb-1">DST</div>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm"
            value={form.dst}
            onChange={(e) => setField("dst", e.target.value)}
          >
            {DISEASE_SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Disease area</div>
          <Input value={form.disease} onChange={(e) => setField("disease", e.target.value)} placeholder="e.g., Prostate" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Indication group</div>
          <Input value={form.indicationGroup} onChange={(e) => setField("indicationGroup", e.target.value)} placeholder="e.g., Metastatic 2nd line+" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Indication (optional)</div>
          <Input value={form.indication} onChange={(e) => setField("indication", e.target.value)} placeholder="e.g., EGFR, PD-L1 TPS ≥ 50%" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Trial ID</div>
          <Input value={form.id} onChange={(e) => setField("id", e.target.value)} placeholder="e.g., PUMA-ALI-4201" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">NCT (optional)</div>
          <Input value={form.nct} onChange={(e) => setField("nct", e.target.value)} placeholder="e.g., NCT03678025" />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="text-slate-600 mb-1">Title</div>
          <Input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Full study title" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Protocol</div>
          <Input value={form.protocol} onChange={(e) => setField("protocol", e.target.value)} placeholder="Protocol #" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Status</div>
          <select
            className="w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-2 text-sm"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Phase (optional)</div>
          <Input value={form.phase} onChange={(e) => setField("phase", e.target.value)} placeholder="I / II / III / Observational" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">PI (optional)</div>
          <Input value={form.pi} onChange={(e) => setField("pi", e.target.value)} placeholder="Principal Investigator" />
        </label>

        <label className="text-sm">
          <div className="text-slate-600 mb-1">Sponsor (optional)</div>
          <Input value={form.sponsor} onChange={(e) => setField("sponsor", e.target.value)} placeholder="Sponsor" />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="text-slate-600 mb-1">Notes (optional)</div>
          <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Anything staff should know" />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="text-slate-600 mb-1">Keywords (comma-separated)</div>
          <Input value={form.keywords} onChange={(e) => setField("keywords", e.target.value)} placeholder="e.g., NMIBC, EV+ICI" />
        </label>

        <label className="text-sm md:col-span-2">
          <div className="text-slate-600 mb-1">Details link (optional)</div>
          <Input value={form.link} onChange={(e) => setField("link", e.target.value)} placeholder="https://…" />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={submit}>Add trial</Button>
      </div>
    </Modal>
  );
}

