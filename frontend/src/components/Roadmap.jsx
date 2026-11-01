import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  AlertCircle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { API_BASE_URL, getErrorMessage } from "../api";
import { IconBadge, Skeleton } from "./ui";

const PROGRESS_KEY = "roadmapProgress";
const EASE = [0.22, 1, 0.36, 1];

const MONTHS = [
  {
    key: "month1",
    label: "Month 1",
    title: "Foundation & setup",
    hint: "Build the base skills and set up a repeatable study workflow.",
  },
  {
    key: "month2",
    label: "Month 2",
    title: "Build & integrate",
    hint: "Apply the fundamentals in role-specific features and projects.",
  },
  {
    key: "month3",
    label: "Month 3",
    title: "Interview prep & portfolio",
    hint: "Practice DSA and mock interviews, then ship a portfolio-ready project.",
  },
];

const EMPTY_ROADMAP = {
  month1: [],
  month2: [],
  month3: [],
};

const SEVERITY_RANK = { High: 0, Medium: 1, Low: 2 };

function progressKey(monthKey, step) {
  return `${monthKey}::${step}`;
}

function readStoredProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function persistProgress(progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Progress persistence is a nice-to-have; ignore storage failures.
  }
}

function sourceLabel(source) {
  if (source === "jobDescription") return "Custom JD";
  if (source === "provided") return "Latest analysis";
  return "Role profile";
}

function normalizeRoadmap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_ROADMAP };
  }

  return MONTHS.reduce((result, month) => {
    const items = Array.isArray(raw[month.key]) ? raw[month.key] : [];
    result[month.key] = items
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
    return result;
  }, {});
}

function normalizeSeverity(value) {
  const severity = String(value || "").toLowerCase();
  if (severity === "high" || severity === "critical") return "High";
  if (severity === "low") return "Low";
  return "Medium";
}

function normalizeMissingSkills(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();

  return value
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

export default function Roadmap({ analysis = null, missingSkills } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [checked, setChecked] = useState(readStoredProgress);

  const loadRoadmap = useCallback(async () => {
    // The gap-analysis response already contains the detailed roadmap, so
    // render it immediately without a second API call.
    if (
      analysis?.roadmap &&
      typeof analysis.roadmap === "object" &&
      !Array.isArray(analysis.roadmap)
    ) {
      setData({
        targetRole: analysis.targetRole || "",
        roadmap: normalizeRoadmap(analysis.roadmap),
        missingSkills: normalizeMissingSkills(
          analysis.missingSkills ?? analysis.missing
        ),
        source: analysis.source,
        analysis: analysis.analysis || null,
      });
      setLoading(false);
      setError("");
      setNotice("");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setData(null);
      setLoading(false);
      setError("You are not logged in. Please log in again.");
      return;
    }

    setLoading(true);
    setError("");
    setNotice("");

    try {
      const payload =
        Array.isArray(missingSkills) && missingSkills.length > 0
          ? { missingSkills }
          : {};

      const { data: response } = await axios.post(
        `${API_BASE_URL}/resume/roadmap`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const result = response?.data || null;

      setData({
        targetRole: result?.targetRole || "",
        roadmap: normalizeRoadmap(result?.roadmap),
        missingSkills: normalizeMissingSkills(
          result?.missingSkills ?? result?.missingSkillNames
        ),
        source: result?.source,
        analysis: null,
      });
    } catch (err) {
      setData(null);

      if (err?.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err?.response?.status === 400) {
        setNotice(
          "Upload a resume and run a skill-gap analysis to generate your personalized roadmap."
        );
      } else {
        setError(getErrorMessage(err, "Could not generate your roadmap."));
      }
    } finally {
      setLoading(false);
    }
  }, [analysis, missingSkills]);

  useEffect(() => {
    // Defer so the mount effect does not synchronously trigger state updates.
    const timer = setTimeout(loadRoadmap, 0);
    return () => clearTimeout(timer);
  }, [loadRoadmap]);

  function toggleStep(monthKey, step) {
    const key = progressKey(monthKey, step);

    setChecked((current) => {
      const next = { ...current, [key]: !current[key] };
      persistProgress(next);
      return next;
    });
  }

  function resetProgress() {
    setChecked((current) => {
      const next = { ...current };
      const roadmap = data?.roadmap || EMPTY_ROADMAP;

      for (const month of MONTHS) {
        for (const step of roadmap[month.key] || []) {
          delete next[progressKey(month.key, step)];
        }
      }

      persistProgress(next);
      return next;
    });
  }

  const roadmap = normalizeRoadmap(data?.roadmap);
  const missing = Array.isArray(data?.missingSkills) ? data.missingSkills : [];
  const totalSteps = MONTHS.reduce(
    (total, month) => total + roadmap[month.key].length,
    0
  );
  const completedSteps = MONTHS.reduce(
    (total, month) =>
      total +
      roadmap[month.key].filter((step) => checked[progressKey(month.key, step)])
        .length,
    0
  );
  const progress =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <section className="glass-card relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl"
      />

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconBadge icon={MapIcon} />
          <div>
            <h2 className="text-base font-semibold text-white">
              Personalized preparation roadmap
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              A three-month plan built from your highest-priority skill gaps.
              Check items off as you complete them — progress is saved in this
              browser.
            </p>
          </div>
        </div>

        {data && totalSteps > 0 && (
          <button
            type="button"
            onClick={resetProgress}
            disabled={completedSteps === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-400/30 hover:bg-amber-500/10 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset progress
          </button>
        )}
      </header>

      {loading && <RoadmapSkeleton />}

      {!loading && notice && (
        <p className="mt-5 flex items-start gap-2 rounded-xl border border-indigo-400/15 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
          <Target className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      {!loading && error && (
        <p
          role="alert"
          className="mt-5 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {!loading && !notice && !error && data && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-slate-400">
              {sourceLabel(data.source)}
            </span>
            <span className="font-semibold text-slate-200">
              {data.targetRole || "Your target role"}
            </span>
            {data.analysis?.source === "ai" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 font-bold uppercase tracking-[0.14em] text-violet-200">
                <BrainCircuit className="h-3 w-3" />
                AI plan
              </span>
            )}
          </div>

          {data.analysis?.summary && (
            <p className="mt-3 rounded-xl border border-indigo-400/15 bg-indigo-500/[0.08] px-4 py-3 text-sm leading-6 text-indigo-100">
              {data.analysis.summary}
            </p>
          )}

          {missing.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Skill gaps driving this plan
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <span
                    key={item.skill}
                    title={item.reason || undefined}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      item.severity === "High"
                        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                        : "border-amber-400/20 bg-amber-500/10 text-amber-200"
                    }`}
                  >
                    {item.skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {totalSteps > 0 && (
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-600/20 via-slate-900/70 to-slate-950 p-4">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-cyan-400/10 blur-2xl"
              />
              <div className="relative flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-200">
                    <Sparkles className="h-3 w-3" />
                    Overall Preparation Progress
                  </p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-white">
                    {progress}%
                  </p>
                </div>
                <p className="text-xs font-medium text-slate-400">
                  {completedSteps} of {totalSteps} tasks complete
                </p>
              </div>
              <div className="relative mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: EASE }}
                />
              </div>
            </div>
          )}

          {totalSteps === 0 ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <div>
                <p className="text-sm font-semibold text-emerald-200">
                  No skill gaps found
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-100/70">
                  You already match every requirement for{" "}
                  {data.targetRole || "this target"}. Keep building projects and
                  revisit this roadmap when you change roles.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative mt-6">
              <div
                aria-hidden="true"
                className="absolute bottom-5 left-4 top-5 w-px -translate-x-1/2 bg-gradient-to-b from-indigo-400/40 via-white/10 to-transparent"
              />

              <ol className="space-y-5">
                {MONTHS.map((month, index) => {
                  const items = roadmap[month.key];
                  const done = items.filter((step) =>
                    checked[progressKey(month.key, step)]
                  ).length;
                  const complete = items.length > 0 && done === items.length;

                  return (
                    <motion.li
                      key={month.key}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: index * 0.08, ease: EASE }}
                      className="relative pl-12"
                    >
                      <span
                        className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-slate-950 ${
                          complete
                            ? "bg-emerald-500 text-white"
                            : items.length > 0
                              ? "bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-950/40"
                              : "border border-white/10 bg-white/[0.04] text-slate-500"
                        }`}
                      >
                        {complete ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </span>

                      <div
                        className={`rounded-2xl border p-4 backdrop-blur-xl transition-colors ${
                          complete
                            ? "border-emerald-400/20 bg-emerald-500/[0.05]"
                            : "border-white/[0.08] bg-white/[0.03]"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-300">
                              <CalendarDays className="h-3 w-3" />
                              {month.label}
                            </p>
                            <h3 className="mt-1 text-sm font-semibold text-white">
                              {month.title}
                            </h3>
                            <p className="mt-0.5 text-xs leading-5 text-slate-500">
                              {month.hint}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                              complete
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                                : "border-indigo-400/15 bg-indigo-500/10 text-indigo-200"
                            }`}
                          >
                            {done}/{items.length}
                          </span>
                        </div>

                        {items.length > 0 ? (
                          <ul className="mt-3 space-y-1.5">
                            {items.map((step) => {
                              const key = progressKey(month.key, step);
                              const isDone = Boolean(checked[key]);

                              return (
                                <li key={key}>
                                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.04]">
                                    <input
                                      type="checkbox"
                                      checked={isDone}
                                      onChange={() => toggleStep(month.key, step)}
                                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-slate-950 accent-indigo-500"
                                    />
                                    <span
                                      className={`text-sm leading-5 ${
                                        isDone
                                          ? "text-slate-600 line-through"
                                          : "text-slate-300"
                                      }`}
                                    >
                                      {step}
                                    </span>
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="mt-3 text-xs text-slate-500">
                            No tasks scheduled for this month.
                          </p>
                        )}
                      </div>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RoadmapSkeleton() {
  return (
    <div className="mt-5 space-y-4">
      <div className="glass-inset rounded-2xl p-4">
        <div className="flex items-end justify-between gap-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="mt-3 h-2.5 w-full rounded-full" />
      </div>

      {[0, 1, 2].map((item) => (
        <div key={item} className="flex gap-4">
          <Skeleton className="mt-1 h-8 w-8 shrink-0 rounded-full" />
          <div className="glass-inset flex-1 rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
