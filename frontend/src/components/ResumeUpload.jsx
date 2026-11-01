import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  CloudUpload,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import { API_BASE_URL, getErrorMessage } from "../api";
import { IconBadge, Skeleton } from "./ui";

const MAX_SIZE = 5 * 1024 * 1024;
const DEFAULT_TARGET_ROLE = "Frontend Developer";
const CUSTOM_ROLE_OPTION = "__custom__";
const ROLE_OPTIONS = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "Data Analyst",
  "Data Scientist",
  "UI/UX Designer",
  "Marketing",
  "HR",
  "Teacher",
  "Lawyer",
  "Civil Engineer",
];

function readStoredTargetRole() {
  try {
    const stored = JSON.parse(localStorage.getItem("user"));
    const storedRole =
      typeof stored?.targetRole === "string" ? stored.targetRole.trim() : "";

    if (!storedRole || /^other(\s*\(.*\))?$/i.test(storedRole)) {
      return { selection: DEFAULT_TARGET_ROLE, customRole: "" };
    }

    if (ROLE_OPTIONS.includes(storedRole)) {
      return { selection: storedRole, customRole: "" };
    }

    return { selection: CUSTOM_ROLE_OPTION, customRole: storedRole };
  } catch {
    return { selection: DEFAULT_TARGET_ROLE, customRole: "" };
  }
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResumeUpload({ onUploaded }) {
  const inputRef = useRef(null);
  const [initialRole] = useState(readStoredTargetRole);
  const [file, setFile] = useState(null);
  const [roleSelection, setRoleSelection] = useState(initialRole.selection);
  const [customRole, setCustomRole] = useState(initialRole.customRole);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const resolvedTargetRole =
    roleSelection === CUSTOM_ROLE_OPTION ? customRole.trim() : roleSelection;

  function acceptFile(next) {
    setStatus(null);
    setResult(null);

    if (!next) return;

    const isPdf =
      next.type === "application/pdf" ||
      next.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setFile(null);
      setStatus({ type: "error", message: "Only PDF files are allowed." });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (next.size > MAX_SIZE) {
      setFile(null);
      setStatus({ type: "error", message: "The PDF must be 5 MB or smaller." });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(next);
  }

  function handleDrop(event) {
    event.preventDefault();
    if (loading) return;
    acceptFile(event.dataTransfer.files?.[0] || null);
  }

  async function handleUpload() {
    if (!file || loading) return;

    const roleToSend =
      roleSelection === CUSTOM_ROLE_OPTION ? customRole.trim() : roleSelection;

    if (!roleToSend) {
      setStatus({
        type: "error",
        message: "Enter the custom role you are preparing for.",
      });
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      const message = "You are not logged in. Please log in again.";
      setStatus({ type: "error", message });
      window.alert(message);
      return;
    }

    setLoading(true);
    setStatus(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("targetRole", roleToSend);

      // Do not set Content-Type: the browser must add the multipart boundary.
      const { data } = await axios.post(
        `${API_BASE_URL}/resume/upload`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const message =
        data?.message || "Resume uploaded and parsed successfully.";
      const nextSkills = data?.data?.resumeSkills ?? data?.data?.skills ?? [];
      const savedRole = data?.data?.targetRole ?? roleToSend;
      const savedRoleSkills = data?.data?.targetRoleSkills;
      const savedRoleSkillsSource = data?.data?.targetRoleSkillsSource;

      setResult(data?.data || null);
      setStatus({ type: "success", message });
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";

      // Reflect backend role normalization (e.g. "front end" -> Frontend Developer).
      if (ROLE_OPTIONS.includes(savedRole)) {
        setRoleSelection(savedRole);
        setCustomRole("");
      } else {
        setRoleSelection(CUSTOM_ROLE_OPTION);
        setCustomRole(savedRole);
      }

      // Keep the locally cached profile in sync before notifying the parent.
      try {
        const stored = JSON.parse(localStorage.getItem("user")) || {};
        const nextStored = {
          ...stored,
          targetRole: savedRole,
          skills: nextSkills,
          resumeSkills: nextSkills,
        };

        if (Array.isArray(savedRoleSkills)) {
          nextStored.targetRoleSkills = savedRoleSkills;
        }
        if (typeof savedRoleSkillsSource === "string") {
          nextStored.targetRoleSkillsSource = savedRoleSkillsSource;
        }

        localStorage.setItem("user", JSON.stringify(nextStored));
      } catch {
        // Ignore storage failures; the backend already saved the data.
      }

      if (Array.isArray(nextSkills)) onUploaded?.(nextSkills, data?.data || null);

      window.alert(message);
    } catch (error) {
      const message =
        error?.response?.status === 401
          ? "Your session has expired. Please log in again."
          : getErrorMessage(error, "Could not upload the resume.");

      setStatus({ type: "error", message });
      window.alert(message);
    } finally {
      setLoading(false);
    }
  }

  const resultSkills = result?.resumeSkills ?? result?.skills ?? [];

  return (
    <section className="glass-card relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-indigo-500/10 blur-3xl"
      />

      <header className="relative flex items-start gap-3">
        <IconBadge icon={FileText} />
        <div>
          <h2 className="text-base font-semibold text-white">Resume upload</h2>
          <p className="mt-0.5 text-sm text-slate-400">
            Pick any career. Preset roles use curated skills, while custom roles
            get an AI-generated profile.
          </p>
        </div>
      </header>

      <div className="relative mt-5">
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center transition ${
            file
              ? "border-indigo-400/40 bg-indigo-500/[0.07]"
              : "border-white/15 bg-slate-950/30 hover:border-indigo-400/40 hover:bg-indigo-500/[0.05]"
          } ${loading ? "pointer-events-none opacity-60" : ""}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={loading}
            onChange={(event) => acceptFile(event.target.files?.[0] || null)}
          />

          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 text-indigo-300 shadow-lg shadow-indigo-950/30 transition group-hover:scale-105">
            {file ? (
              <FileText className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <CloudUpload className="h-5 w-5" strokeWidth={1.8} />
            )}
          </span>

          <span className="mt-3 max-w-full truncate text-sm font-semibold text-slate-200">
            {file ? file.name : "Click to choose a PDF"}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            {file ? formatBytes(file.size) : "or drag and drop it here"}
          </span>

          {file && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              Ready to upload
            </span>
          )}
        </label>
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role={status.type === "error" ? "alert" : "status"}
            className={`mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm ${
              status.type === "success"
                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                : "border-rose-400/20 bg-rose-500/10 text-rose-200"
            }`}
          >
            {status.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {status.message}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && <UploadSkeleton />}

      <AnimatePresence>
        {!loading && result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-inset relative mt-4 rounded-xl p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                {result.characters?.toLocaleString()} characters extracted
              </span>
              <span className="rounded-full border border-indigo-400/15 bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-200">
                {result.targetRole || resolvedTargetRole}
              </span>
              {result.targetRoleSkillsSource === "ai" && (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/15 bg-violet-500/10 px-2 py-0.5 font-medium text-violet-200">
                  <Sparkles className="h-3 w-3" />
                  AI role skills
                </span>
              )}
              {result.truncated && (
                <span className="rounded-full border border-amber-400/15 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-200">
                  truncated
                </span>
              )}
            </div>

            {Array.isArray(resultSkills) && resultSkills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {resultSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-indigo-400/15 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                No known skills detected. Try a more detailed resume.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mt-4">
        <label
          htmlFor="target-role"
          className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
        >
          <Briefcase className="h-3 w-3 text-slate-500" />
          Target role
        </label>
        <select
          id="target-role"
          value={roleSelection}
          onChange={(event) => {
            const nextRole = event.target.value;
            setRoleSelection(nextRole);
            if (nextRole !== CUSTOM_ROLE_OPTION) setCustomRole("");
            setStatus(null);
            setResult(null);
          }}
          disabled={loading}
          className="premium-input premium-select"
        >
          {ROLE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
          <option value={CUSTOM_ROLE_OPTION}>
            Other (Type your custom role)
          </option>
        </select>

        <AnimatePresence initial={false}>
          {roleSelection === CUSTOM_ROLE_OPTION && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3"
            >
              <label
                htmlFor="custom-target-role"
                className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
              >
                <Sparkles className="h-3 w-3 text-indigo-300" />
                Custom role
              </label>
              <div className="relative">
                <Sparkles className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-300" />
                <input
                  id="custom-target-role"
                  type="text"
                  value={customRole}
                  onChange={(event) => {
                    setCustomRole(event.target.value);
                    setStatus(null);
                    setResult(null);
                  }}
                  maxLength={80}
                  disabled={loading}
                  placeholder="e.g. Biotech Engineer"
                  autoComplete="off"
                  className="premium-input has-icon"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                We'll ask AI to generate the top skills for this role.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="mt-2 text-xs text-slate-500">
          Your resume is compared against the skills expected for this role.
        </p>
      </div>

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || loading || !resolvedTargetRole}
        className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CloudUpload className="h-4 w-4" />
        )}
        {loading ? "Parsing resume..." : "Upload resume"}
      </button>
    </section>
  );
}

function UploadSkeleton() {
  return (
    <div className="glass-inset mt-4 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}
