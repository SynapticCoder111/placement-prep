import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Gauge,
  GraduationCap,
  Layers3,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Map as MapIcon,
  PieChart as PieChartIcon,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api, { getErrorMessage } from "./api";
import ResumeUpload from "./components/ResumeUpload";
import SkillGap from "./components/SkillGap";
import Roadmap from "./components/Roadmap";
import MockInterview from "./components/MockInterview";
import {
  IconBadge,
  Reveal,
  SectionHeading,
  Skeleton,
  StatPill,
} from "./components/ui";

const TOKEN_KEY = "token";
const USER_KEY = "user";
const EMPTY_INTERVIEW_STATS = {
  interviewScores: [],
  interviewCount: 0,
  averageInterviewScore: 0,
};

const EASE = [0.22, 1, 0.36, 1];
const CHART_TOOLTIP_STYLE = {
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,6,23,0.94)",
  color: "#e2e8f0",
  fontSize: 12,
  boxShadow: "0 18px 50px -24px rgba(0,0,0,0.95)",
};

const AUTH_FEATURES = [
  {
    icon: ScanSearch,
    title: "Deep skill-gap scan",
    copy: "See exactly what separates you from the role.",
  },
  {
    icon: MapIcon,
    title: "3-month roadmap",
    copy: "A month-by-month plan you can actually finish.",
  },
  {
    icon: BrainCircuit,
    title: "AI mock interviews",
    copy: "Role-specific practice with instant feedback.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    copy: "Your resume and progress stay in your account.",
  },
];

/* ---------------------------------------------------------------- */
/* Helpers                                                           */
/* ---------------------------------------------------------------- */

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}

function clampScore(value) {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function AmbientBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="absolute -left-40 -top-48 h-[38rem] w-[38rem] rounded-full bg-indigo-600/20 blur-[130px]" />
      <div className="absolute -right-40 top-1/4 h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-[130px]" />
      <div className="absolute -bottom-56 left-1/3 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/10 blur-[150px]" />
      <div className="app-grid absolute inset-0 opacity-70" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* App                                                               */
/* ---------------------------------------------------------------- */

export default function App() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);
  const [prefillEmail, setPrefillEmail] = useState("");

  function handleLoginSuccess(nextToken, nextUser) {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser ?? {}));
    setToken(nextToken);
    setUser(nextUser);
  }

  function handleRegisterSuccess(email) {
    setPrefillEmail(email);
    setMode("login");
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setPrefillEmail("");
    setMode("login");
  }

  function handleSkillsUpdated(skills, uploadData) {
    setUser((previous) => {
      const next = {
        ...(previous || {}),
        skills,
        resumeSkills: uploadData?.resumeSkills ?? skills,
        targetRole: uploadData?.targetRole ?? previous?.targetRole ?? "",
        targetRoleSkills:
          uploadData?.targetRoleSkills ?? previous?.targetRoleSkills ?? [],
        targetRoleSkillsSource:
          uploadData?.targetRoleSkillsSource ??
          previous?.targetRoleSkillsSource ??
          "",
      };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <AmbientBackground />

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {token ? (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <Dashboard
                user={user}
                onLogout={handleLogout}
                onSkillsUpdated={handleSkillsUpdated}
              />
            </motion.div>
          ) : (
            <motion.div
              key="auth"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <AuthScreen
                mode={mode}
                onModeChange={setMode}
                prefillEmail={prefillEmail}
                onLoginSuccess={handleLoginSuccess}
                onRegisterSuccess={handleRegisterSuccess}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Auth screen                                                       */
/* ---------------------------------------------------------------- */

function AuthScreen({
  mode,
  onModeChange,
  prefillEmail,
  onLoginSuccess,
  onRegisterSuccess,
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.04fr_0.96fr]">
        <motion.section
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
          className="hidden lg:block"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered placement preparation
          </div>

          <h1 className="mt-6 max-w-2xl text-5xl font-semibold leading-[1.06] tracking-tight text-white xl:text-6xl">
            Turn your resume into a{" "}
            <span className="text-gradient">placement plan.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
            Measure your readiness, close skill gaps, follow a focused roadmap,
            and rehearse interviews with an AI coach built for your target role.
          </p>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {AUTH_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-indigo-500/10 text-indigo-300">
                    <feature.icon className="h-4 w-4" strokeWidth={1.8} />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {feature.title}
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {feature.copy}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Resume parsing
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Priority skill gaps
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Voice interviews
            </span>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15, ease: EASE }}
          className="w-full max-w-md justify-self-center lg:max-w-none"
        >
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-950/40">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Placement Prep</p>
              <p className="text-xs text-slate-400">AI placement intelligence</p>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-1.5">
            <div className="rounded-[1.55rem] bg-slate-950/25 p-5 sm:p-7">
              <div className="flex items-start gap-3">
                <IconBadge icon={GraduationCap} />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300">
                    Student workspace
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {mode === "login"
                      ? "Sign in to continue to your placement dashboard."
                      : "Start building your personalized placement plan."}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-slate-950/40 p-1">
                {["login", "register"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => onModeChange(tab)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
                      mode === tab
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, x: mode === "login" ? -8 : 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: mode === "login" ? 8 : -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {mode === "login" ? (
                      <LoginForm
                        initialEmail={prefillEmail}
                        onSuccess={onLoginSuccess}
                      />
                    ) : (
                      <RegisterForm onSuccess={onRegisterSuccess} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/10 pt-4 text-[11px] text-slate-500">
                <LockKeyhole className="h-3 w-3" />
                Secure authentication powered by JWT
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- */
/* Login form                                                        */
/* ---------------------------------------------------------------- */

function LoginForm({ initialEmail = "", onSuccess }) {
  const [form, setForm] = useState({ email: initialEmail, password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      if (!data?.token) {
        throw new Error("The server did not return a token.");
      }

      window.alert("Login Successful");
      onSuccess(data.token, data.data ?? null);
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <Field
        id="login-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        icon={Mail}
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        required
      />

      <PasswordField
        id="login-password"
        label="Password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={form.password}
        onChange={(event) => setForm({ ...form, password: event.target.value })}
        required
      />

      <SubmitButton loading={loading} loadingText="Signing in...">
        Login
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------------- */
/* Register form                                                     */
/* ---------------------------------------------------------------- */

function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      window.alert("Registration Successful");
      onSuccess(form.email.trim());
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <Alert>{error}</Alert>}

      <Field
        id="register-name"
        label="Name"
        type="text"
        autoComplete="name"
        placeholder="Ada Lovelace"
        icon={UserRound}
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        required
      />

      <Field
        id="register-email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        icon={Mail}
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.target.value })}
        required
      />

      <PasswordField
        id="register-password"
        label="Password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={form.password}
        onChange={(event) => setForm({ ...form, password: event.target.value })}
        minLength={8}
        required
      />

      <SubmitButton loading={loading} loadingText="Creating account...">
        Create account
      </SubmitButton>
    </form>
  );
}

/* ---------------------------------------------------------------- */
/* Dashboard                                                         */
/* ---------------------------------------------------------------- */

function Dashboard({ user, onLogout, onSkillsUpdated }) {
  const [gapResult, setGapResult] = useState(null);
  const [gapLoading, setGapLoading] = useState(true);
  const [interviewStats, setInterviewStats] = useState(EMPTY_INTERVIEW_STATS);
  const [interviewLoading, setInterviewLoading] = useState(true);

  const name = (user?.name || "").trim() || "there";
  const firstName = name.split(/\s+/)[0];
  const skills = Array.isArray(user?.skills) ? user.skills : [];
  const targetRole =
    user?.targetRole || gapResult?.targetRole || "No role selected";
  const initials =
    name === "there"
      ? "?"
      : name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0].toUpperCase())
          .join("");

  const refreshGap = useCallback(async () => {
    setGapLoading(true);

    try {
      const { data } = await api.post("/resume/analyze", {
        jobDescription: "",
      });
      setGapResult(data?.data || null);
    } catch (err) {
      if (err?.response?.status === 400) setGapResult(null);
    } finally {
      setGapLoading(false);
    }
  }, []);

  const refreshInterviewStats = useCallback(async () => {
    setInterviewLoading(true);

    try {
      const { data } = await api.get("/ai/stats");
      setInterviewStats(data?.data ?? EMPTY_INTERVIEW_STATS);
    } catch {
      // Keep the empty state if stats cannot be loaded.
    } finally {
      setInterviewLoading(false);
    }
  }, []);

  useEffect(() => {
    // Defer so the mount effect does not synchronously trigger state updates.
    const timer = setTimeout(() => {
      refreshGap();
      refreshInterviewStats();
    }, 0);

    return () => clearTimeout(timer);
  }, [refreshGap, refreshInterviewStats]);

  function handleResumeUploaded(nextSkills, uploadData) {
    // The previous gap belongs to the old resume, so clear it and recompute.
    setGapResult(null);
    onSkillsUpdated?.(nextSkills, uploadData);
    refreshGap();
  }

  function handleGapAnalyzed(nextResult) {
    setGapResult(nextResult || null);
    setGapLoading(false);
  }

  function handleInterviewEvaluated(nextData) {
    if (!nextData) return;

    setInterviewStats({
      interviewScores: Array.isArray(nextData.interviewScores)
        ? nextData.interviewScores
        : [],
      interviewCount: Number(nextData.interviewCount) || 0,
      averageInterviewScore: Number(nextData.averageInterviewScore) || 0,
    });
    setInterviewLoading(false);
  }

  const resumeMatch = Number(gapResult?.matchPercentage);
  const hasResumeMatch = Boolean(gapResult) && Number.isFinite(resumeMatch);
  const averageInterviewScore =
    Number(interviewStats.averageInterviewScore) || 0;
  const hasInterviews = Number(interviewStats.interviewCount) > 0;
  const overallReadiness =
    hasResumeMatch && hasInterviews
      ? Math.round((resumeMatch + averageInterviewScore) / 2)
      : hasResumeMatch
        ? Math.round(resumeMatch)
        : hasInterviews
          ? Math.round(averageInterviewScore)
          : 0;
  const matchedCount = Array.isArray(gapResult?.matched)
    ? gapResult.matched.length
    : Array.isArray(gapResult?.matchedSkills)
      ? gapResult.matchedSkills.length
      : 0;
  const missingCount = Array.isArray(gapResult?.missing)
    ? gapResult.missing.length
    : Array.isArray(gapResult?.missingSkills)
      ? gapResult.missingSkills.length
      : 0;
  const requiredCount = Array.isArray(gapResult?.requiredSkills)
    ? gapResult.requiredSkills.length
    : matchedCount + missingCount;
  const readinessLabel =
    overallReadiness >= 75
      ? "Placement ready"
      : overallReadiness >= 50
        ? "Making good progress"
        : overallReadiness > 0
          ? "Keep building"
          : "Not assessed yet";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-950/50">
              <Brain className="h-5 w-5" strokeWidth={1.9} />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">
                Placement Prep
              </p>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                AI placement intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 text-[10px] font-bold text-white">
                {initials}
              </span>
              <div className="max-w-[12rem]">
                <p className="truncate text-xs font-semibold text-white">{name}</p>
                <p className="truncate text-[10px] text-slate-400">
                  {user?.email || "Signed in"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE }}
          className="glass-panel relative overflow-hidden rounded-[2rem]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px]"
          />

          <div className="relative grid gap-7 p-5 sm:p-7 lg:grid-cols-[1.35fr_1fr] lg:p-8">
            <div className="flex flex-col justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-200">
                    <Sparkles className="h-3 w-3" />
                    Placement command center
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
                    <ShieldCheck className="h-3 w-3" />
                    {readinessLabel}
                  </span>
                </div>

                <div className="mt-5 flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-fuchsia-600 text-xl font-bold text-white shadow-xl shadow-indigo-950/40 ring-1 ring-white/15">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      Welcome back, {firstName}
                    </h1>
                    <p className="truncate text-sm text-slate-400">
                      {user?.email || "Signed in"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatPill icon={Target}>{targetRole}</StatPill>
                  <StatPill icon={Layers3} tone="slate">
                    {skills.length} skills
                  </StatPill>
                  <StatPill icon={Bot} tone="emerald">
                    {interviewStats.interviewCount} interviews
                  </StatPill>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Metric
                  icon={FileText}
                  label="Resume match"
                  value={hasResumeMatch ? `${Math.round(resumeMatch)}%` : "—"}
                  hint={
                    hasResumeMatch
                      ? `${matchedCount} of ${requiredCount} skills`
                      : "Run an analysis"
                  }
                  loading={gapLoading}
                  tone="indigo"
                />
                <Metric
                  icon={TrendingUp}
                  label="Interview average"
                  value={
                    hasInterviews ? `${Math.round(averageInterviewScore)}` : "—"
                  }
                  hint={
                    hasInterviews
                      ? `${interviewStats.interviewCount} answered`
                      : "No attempts yet"
                  }
                  loading={interviewLoading}
                  tone="emerald"
                />
                <Metric
                  icon={Layers3}
                  label="Skills detected"
                  value={skills.length}
                  hint="From your latest resume"
                  tone="cyan"
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl border border-indigo-400/15 bg-gradient-to-br from-indigo-600/25 via-slate-900/80 to-slate-950 p-5 shadow-2xl shadow-slate-950/50 sm:p-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-indigo-400/20 blur-3xl"
              />
              <div className="relative flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">
                    Overall placement readiness
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Resume match blended with interview performance
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-indigo-200">
                  <Gauge className="h-5 w-5" />
                </div>
              </div>

              <div className="relative mt-5 flex flex-col items-center gap-5 sm:flex-row">
                <ReadinessGauge score={overallReadiness} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {readinessLabel}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Keep closing the high-priority gaps and practicing
                    interviews to push this score higher.
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <ScoreLine
                      label="Resume match"
                      value={
                        hasResumeMatch
                          ? `${Math.round(resumeMatch)}%`
                          : "Not analysed"
                      }
                      bar={hasResumeMatch ? resumeMatch : 0}
                      color="bg-emerald-400"
                    />
                    <ScoreLine
                      label="Interview average"
                      value={
                        hasInterviews
                          ? `${Math.round(averageInterviewScore)}%`
                          : "Not started"
                      }
                      bar={hasInterviews ? averageInterviewScore : 0}
                      color="bg-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative grid gap-4 border-t border-white/10 bg-slate-950/25 p-5 sm:grid-cols-2 lg:p-6">
            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-emerald-300" />
                  <p className="text-sm font-semibold text-white">
                    Skill gap snapshot
                  </p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {gapResult?.source === "jobDescription"
                    ? "Custom JD"
                    : "Target role"}
                </span>
              </div>
              <SkillGapPie matched={matchedCount} missing={missingCount} />
            </div>

            <div className="glass-card rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan-300" />
                  <p className="text-sm font-semibold text-white">
                    Interview score history
                  </p>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  {hasInterviews
                    ? `${interviewStats.interviewCount} attempts`
                    : "No attempts"}
                </span>
              </div>
              <InterviewScoreChart scores={interviewStats.interviewScores} />
            </div>
          </div>
        </motion.section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Reveal delay={0.02}>
            <SectionHeading
              number="1"
              icon={FileText}
              title="Resume upload & role selection"
              description="Upload a text-based PDF and choose the role you are targeting."
            />
            <ResumeUpload onUploaded={handleResumeUploaded} />
          </Reveal>

          <Reveal delay={0.08}>
            <SectionHeading
              number="2"
              icon={BrainCircuit}
              title="Skill gap analysis"
              description="See what matches the role and what you still need to learn."
            />
            <SkillGap result={gapResult} onAnalyzed={handleGapAnalyzed} />
          </Reveal>
        </div>

        <Reveal delay={0.06} className="mt-8">
          <SectionHeading
            number="3"
            icon={MapIcon}
            title="Personalized roadmap"
            description="Follow a three-month plan and track your overall preparation progress."
          />
          <Roadmap analysis={gapResult} missingSkills={gapResult?.missing} />
        </Reveal>

        <Reveal delay={0.06} className="mt-8">
          <SectionHeading
            number="4"
            icon={Bot}
            title="AI mock interview"
            description="Practice role-specific questions and track your interview score."
          />
          <MockInterview onEvaluated={handleInterviewEvaluated} />
        </Reveal>
      </main>

      <footer className="border-t border-white/10 px-4 py-6 text-center text-[11px] text-slate-500 sm:px-6">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          Placement Prep · Resume parsing, skill-gap analysis and AI interview
          practice
        </span>
      </footer>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint, loading, tone = "indigo" }) {
  const tones = {
    indigo: {
      icon: "border-indigo-400/15 bg-indigo-500/10 text-indigo-300",
      value: "text-white",
    },
    emerald: {
      icon: "border-emerald-400/15 bg-emerald-500/10 text-emerald-300",
      value: "text-white",
    },
    cyan: {
      icon: "border-cyan-400/15 bg-cyan-500/10 text-cyan-300",
      value: "text-white",
    },
  };
  const active = tones[tone] || tones.indigo;

  return (
    <div className="glass-inset rounded-2xl p-3.5">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg border ${active.icon}`}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
      </div>
      {loading ? (
        <Skeleton className="mt-2.5 h-7 w-16" />
      ) : (
        <p className={`mt-2 text-2xl font-bold tracking-tight ${active.value}`}>
          {value}
        </p>
      )}
      <p className="mt-0.5 truncate text-[10px] text-slate-500">{hint}</p>
    </div>
  );
}

function ReadinessGauge({ score }) {
  const safe = clampScore(score);
  const stroke =
    safe >= 75 ? "#34d399" : safe >= 50 ? "#fbbf24" : "#fb7185";

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 36 36" className="h-36 w-36 -rotate-90">
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
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${safe} 100`}
          initial={{ strokeDasharray: "0 100" }}
          animate={{ strokeDasharray: `${safe} 100` }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{safe}</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          / 100
        </span>
      </div>
    </div>
  );
}

function ScoreLine({ label, value, bar, color }) {
  const safe = clampScore(bar);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.8, ease: EASE }}
        />
      </div>
    </div>
  );
}

function SkillGapPie({ matched = 0, missing = 0 }) {
  const total = matched + missing;

  if (total === 0) {
    return (
      <ChartEmpty
        icon={PieChartIcon}
        text="Run a skill-gap analysis to compare matched and missing skills."
      />
    );
  }

  const data = [
    { name: "Matched", value: matched },
    { name: "Missing", value: missing },
  ];

  return (
    <div>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={3}
              stroke="none"
            >
              <Cell fill="#34d399" />
              <Cell fill="#fb7185" />
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              itemStyle={{ color: "#c7d2fe" }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Matched {matched}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Missing {missing}
        </span>
        <span className="text-slate-500">
          {Math.round((matched / total) * 100)}% match
        </span>
      </div>
    </div>
  );
}

function InterviewScoreChart({ scores = [] }) {
  const recent = Array.isArray(scores) ? scores.slice(-8) : [];

  if (recent.length === 0) {
    return (
      <ChartEmpty
        icon={BarChart3}
        text="Complete a mock interview to start tracking your scores."
      />
    );
  }

  const data = recent.map((score, index) => ({
    name: `#${index + 1}`,
    score: clampScore(score),
  }));

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(148,163,184,0.13)"
          />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            itemStyle={{ color: "#c7d2fe" }}
            labelStyle={{ color: "#94a3b8" }}
            cursor={{ fill: "rgba(99,102,241,0.08)" }}
          />
          <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={36}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.score >= 75
                    ? "#34d399"
                    : entry.score >= 50
                      ? "#fbbf24"
                      : "#fb7185"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartEmpty({ icon: Icon = Sparkles, text }) {
  return (
    <div className="mt-3 flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-6 text-center text-xs text-slate-500">
      <Icon className="h-5 w-5 text-slate-600" />
      {text}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Shared UI                                                         */
/* ---------------------------------------------------------------- */

function Field({ id, label, icon: Icon, ...props }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        )}
        <input
          id={id}
          className={`premium-input ${Icon ? "has-icon" : ""}`}
          {...props}
        />
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
      >
        {label}
      </label>
      <div className="relative">
        <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="premium-input has-icon has-action"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 transition hover:text-indigo-300 focus:outline-none focus-visible:text-indigo-300"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SubmitButton({ loading, loadingText, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      )}
      {loading ? loadingText : children}
    </button>
  );
}

function Alert({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}
