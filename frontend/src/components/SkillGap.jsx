import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  Loader2,
  ScanSearch,
  Sparkles,
  Target,
  TriangleAlert,
} from "lucide-react";
import { API_BASE_URL, getErrorMessage } from "../api";
import { IconBadge, Skeleton } from "./ui";

const SEVERITY_RANK = { High: 0, Medium: 1, Low: 2 };

function toneFor(percentage) {
  if (percentage >= 70) {
    return {
      bar: "bg-emerald-400",
      text: "text-emerald-300",
      stroke: "#34d399",
    };
  }
  if (percentage >= 40) {
    return {
      bar: "bg-amber-400",
      text: "text-amber-300",
      stroke: "#fbbf24",
    };
  }
  return { bar: "bg-rose-400", text: "text-rose-300", stroke: "#fb7185" };
}

function normalizeSeverity(value) {
  const severity = String(value || "").toLowerCase();
  if (severity === "high" || severity === "critical") return "High";
  if (severity === "low") return "Low";
  return "Medium";
}

function normalizeSkillNames(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && typeof item.skill === "string") {
        return item.skill.trim();
      }
      return "";
    })
    .filter((skill) => {
      if (!skill) return false;
      const key = skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeMissingSkills(result) {
  const detailed = Array.isArray(result?.missingSkillDetails)
    ? result.missingSkillDetails
    : Array.isArray(result?.missingSkills)
      ? result.missingSkills
      : [];
  const names = Array.isArray(result?.missing) ? result.missing : [];

  const raw =
    detailed.length > 0
      ? detailed
      : names.length > 0
        ? names
        : Array.isArray(result?.missingSkills)
          ? result.missingSkills
          : [];

  const seen = new Set();

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { skill: item.trim(), severity: "Medium", reason: "" };
      }
      if (item && typeof item === "object") {
        return {
          skill: String(item.skill || item.name || "").trim(),
          severity: normalizeSeverity(item.severity),
          reason: typeof item.reason === "string" ? item.reason.trim() : "",
        };
      }
      return null;
    })
    .filter((item) => {
      if (!item?.skill) return false;
      const key = item.skill.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) => (SEVERITY_RANK[a.severity] ?? 1) - (SEVERITY_RANK[b.severity] ?? 1)
    );
}

export default function SkillGap({ result = null, onAnalyzed }) {
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(event) {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token) {
      onAnalyzed?.(null);
      setError("You are not logged in. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/resume/analyze`,
        { jobDescription: jobDescription.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const nextResult = data?.data || null;
      onAnalyzed?.(nextResult);
    } catch (err) {
      onAnalyzed?.(null);
      setError(
        err?.response?.status === 401
          ? "Your session has expired. Please log in again."
          : getErrorMessage(err, "Could not analyse the skill gap.")
      );
    } finally {
      setLoading(false);
    }
  }

  const matched = normalizeSkillNames(
    result?.matched ?? result?.matchedSkills ?? []
  );
  const required = normalizeSkillNames(
    result?.requiredSkills ??
      result?.extractedJdSkills ??
      result?.jobSkills ??
      []
  );
  const missingSkills = normalizeMissingSkills(result);
  const highPriority = missingSkills.filter((item) => item.severity === "High");
  const lowPriority = missingSkills.filter((item) => item.severity !== "High");
  const matchPercentage = Math.min(
    100,
    Math.max(0, Math.round(Number(result?.matchPercentage) || 0))
  );
  const readinessScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(Number(result?.readinessScore ?? result?.matchPercentage) || 0)
    )
  );
  const tone = toneFor(matchPercentage);
  const analysisSource =
    result?.analysis?.source === "ai" ? "AI analysis" : "Rule-based analysis";

  return (
    <section className="glass-card relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-fuchsia-500/10 blur-3xl"
      />

      <header className="relative flex items-start gap-3">
        <IconBadge icon={BrainCircuit} />
        <div>
          <h2 className="text-base font-semibold text-white">
            Skill gap analysis
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Compare your resume with your target role, or paste a custom job
            description.
          </p>
        </div>
      </header>

      <form onSubmit={handleAnalyze} className="relative mt-5">
        <label
          htmlFor="job-description"
          className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
        >
          <ScanSearch className="h-3 w-3 text-slate-500" />
          Job description <span className="font-normal text-slate-600">(optional)</span>
        </label>
        <textarea
          id="job-description"
          rows={6}
          value={jobDescription}
          onChange={(event) => setJobDescription(event.target.value)}
          placeholder="Paste a job description to override your saved target role..."
          className="premium-input resize-y py-3"
        />
        <p className="mt-1 text-xs text-slate-500">
          Leave this blank to use the target role saved with your resume.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative"
          >
            <SkillGapSkeleton />
          </motion.div>
        )}

        {!loading && !result && !error && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-white/10 bg-slate-950/25 px-4 py-4"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-indigo-500/10 text-indigo-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Your match score, priority gaps, and AI summary will appear here.
            </p>
          </motion.div>
        )}

        {!loading && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="glass-inset relative mt-5 rounded-2xl p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  <Target className="h-3 w-3" />
                  Target role
                </p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {result.targetRole || "Custom job description"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  {result.source === "jobDescription"
                    ? "Custom JD"
                    : result.requiredSkillsSource === "ai"
                      ? "AI role profile"
                      : "Role profile"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
                    result.analysis?.source === "ai"
                      ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
                      : "border-white/10 bg-white/[0.04] text-slate-400"
                  }`}
                >
                  {result.analysis?.source === "ai" ? (
                    <BrainCircuit className="h-3 w-3" />
                  ) : (
                    <Gauge className="h-3 w-3" />
                  )}
                  {analysisSource}
                </span>
              </div>
            </div>

            {result.analysis?.summary && (
              <p className="mt-3 rounded-xl border border-indigo-400/15 bg-indigo-500/[0.08] px-3.5 py-2.5 text-sm leading-6 text-indigo-100">
                {result.analysis.summary}
              </p>
            )}

            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[8rem_1fr]">
              <div className="flex justify-center">
                <ReadinessRing score={readinessScore} />
              </div>

              <div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Match
                    </p>
                    <p className={`text-2xl font-bold ${tone.text}`}>
                      {matchPercentage}%
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {matched.length} of {required.length} skills
                  </p>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className={`h-full rounded-full ${tone.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${matchPercentage}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>

            <PriorityGroup
              title="High Priority"
              subtitle="Close these first — they are core interview and role requirements."
              items={highPriority}
              tone="high"
              emptyText="No high-priority gaps."
            />

            <PriorityGroup
              title="Low Priority"
              subtitle="Medium and low severity gaps. Learn these after the core skills."
              items={lowPriority}
              tone="low"
              emptyText="No lower-priority gaps."
            />

            <div className="glass-inset mt-4 rounded-xl p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {result.source === "jobDescription"
                  ? "JD requires:"
                  : "Role requires:"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {required.length > 0 ? (
                  required.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-indigo-400/15 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">
                    No required skills found.
                  </span>
                )}
              </div>
            </div>

            <SkillList
              title="Matched skills"
              skills={matched}
              chipClass="border-emerald-400/15 bg-emerald-500/10 text-emerald-200"
              emptyText="No required skills matched yet."
            />
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function ReadinessRing({ score }) {
  const safe = Math.min(100, Math.max(0, Math.round(Number(score) || 0)));
  const tone = toneFor(safe);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
          />
          <motion.circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            stroke={tone.stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${safe} 100`}
            initial={{ strokeDasharray: "0 100" }}
            animate={{ strokeDasharray: `${safe} 100` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${tone.text}`}>{safe}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
            / 100
          </span>
        </div>
      </div>
      <p className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">
        <Gauge className="h-3 w-3" />
        Readiness Score
      </p>
    </div>
  );
}

function PriorityGroup({ title, subtitle, items = [], tone, emptyText }) {
  const isHigh = tone === "high";
  const badgeClass = isHigh
    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
    : "border-amber-400/20 bg-amber-500/10 text-amber-200";
  const countClass = isHigh
    ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
    : "border-amber-400/20 bg-amber-500/10 text-amber-200";
  const Icon = isHigh ? TriangleAlert : Sparkles;

  return (
    <div className="glass-inset mt-4 rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            <Icon className={`h-3.5 w-3.5 ${isHigh ? "text-rose-300" : "text-amber-300"}`} />
            {title}
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">{subtitle}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${countClass}`}
        >
          {items.length}
        </span>
      </div>

      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item.skill}-${index}`}
              className="flex flex-wrap items-start gap-2 rounded-lg border border-white/[0.04] bg-slate-950/30 px-2.5 py-2"
            >
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
              >
                {item.skill}
              </span>
              {item.reason && (
                <span className="text-xs leading-5 text-slate-400">
                  {item.reason}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          {emptyText}
        </p>
      )}
    </div>
  );
}

function SkillList({ title, skills = [], chipClass, emptyText }) {
  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {skills.length > 0 ? (
          skills.map((skill) => (
            <span
              key={skill}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${chipClass}`}
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">{emptyText}</span>
        )}
      </div>
    </div>
  );
}

function SkillGapSkeleton() {
  return (
    <div className="glass-inset mt-5 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>

      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[8rem_1fr]">
        <div className="mx-auto h-28 w-28 rounded-full border-[10px] border-white/[0.06]" />
        <div>
          <div className="flex items-end justify-between gap-2">
            <div className="space-y-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="mt-3 h-2 w-full rounded-full" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
