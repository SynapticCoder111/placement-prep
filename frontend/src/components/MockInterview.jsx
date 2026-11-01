import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  MessageSquareText,
  Mic,
  RefreshCw,
  Sparkles,
  Square,
  Timer,
  TriangleAlert,
  Volume2,
} from "lucide-react";
import { API_BASE_URL, getErrorMessage } from "../api";
import { IconBadge, Skeleton } from "./ui";

const WAVEFORM_HEIGHTS = [0.35, 0.7, 0.45, 0.95, 0.55, 0.8, 0.4, 0.75, 0.3];

function scoreColor(score) {
  if (score >= 75) return "text-emerald-300";
  if (score >= 50) return "text-amber-300";
  return "text-rose-300";
}

function ringColor(score) {
  if (score >= 75) return "#34d399";
  if (score >= 50) return "#fbbf24";
  return "#fb7185";
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function speechErrorMessage(code) {
  const messages = {
    "not-allowed":
      "Microphone access was denied. Allow microphone permissions in your browser and try again.",
    "service-not-allowed":
      "Speech recognition is blocked by your browser settings. Try Chrome, Edge, or Safari.",
    "audio-capture":
      "No microphone was found. Check that a microphone is connected and try again.",
    network:
      "Speech recognition needs a network connection. Check your connection and try again.",
    "no-speech":
      "I couldn't hear anything. Move a little closer to the microphone and try again.",
    "language-not-supported":
      "Voice recognition does not support the selected language in this browser.",
  };

  return messages[code] || "Voice input stopped unexpectedly. Please try again.";
}

export default function MockInterview({ onEvaluated }) {
  const [question, setQuestion] = useState(null);
  const [questionLoading, setQuestionLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [speechSupported] = useState(() => Boolean(getSpeechRecognition()));

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const finalAnswerRef = useRef("");
  const interimRef = useRef("");
  const isRecordingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopVoiceInput = useCallback(() => {
    const recognition = recognitionRef.current;
    const hadSession = Boolean(recognition);
    const pendingInterim = interimRef.current.trim();

    if (pendingInterim) {
      finalAnswerRef.current = [finalAnswerRef.current, pendingInterim]
        .filter(Boolean)
        .join(" ");
    }

    // Null the ref before aborting so late recognition callbacks are ignored.
    recognitionRef.current = null;
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        // The recognizer may already have stopped.
      }
    }

    interimRef.current = "";
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimTranscript("");
    clearTimer();

    if (hadSession) {
      setAnswer(finalAnswerRef.current.trim());
    }
  }, [clearTimer]);

  const fetchQuestion = useCallback(
    async (excludeId = "") => {
      const token = localStorage.getItem("token");

      stopVoiceInput();
      setElapsedSeconds(0);
      setInterimTranscript("");
      setVoiceError("");

      if (!token) {
        setQuestion(null);
        setQuestionLoading(false);
        setError("You are not logged in. Please log in again.");
        return;
      }

      const storedUser = readStoredUser();
      const params = new URLSearchParams();

      if (storedUser?.targetRole) params.set("role", storedUser.targetRole);
      if (excludeId) params.set("excludeId", excludeId);

      const query = params.toString();

      setQuestionLoading(true);
      setError("");
      setFeedback(null);
      setAnswer("");

      try {
        const { data } = await axios.get(
          `${API_BASE_URL}/ai/question${query ? `?${query}` : ""}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const next = data?.data ?? null;

        if (!next?.question) {
          throw new Error("The server did not return an interview question.");
        }

        setQuestion(next);
      } catch (err) {
        setQuestion(null);
        setError(
          err?.response?.status === 401
            ? "Your session has expired. Please log in again."
            : getErrorMessage(err, "Could not load an interview question.")
        );
      } finally {
        setQuestionLoading(false);
      }
    },
    [stopVoiceInput]
  );

  useEffect(() => {
    // Defer so the mount effect does not synchronously trigger state updates.
    const timer = setTimeout(() => fetchQuestion(), 0);
    return () => clearTimeout(timer);
  }, [fetchQuestion]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Ignore cleanup errors.
        }
      }

      clearTimer();
    };
  }, [clearTimer]);

  function startVoiceInput() {
    if (isRecordingRef.current) {
      stopVoiceInput();
      return;
    }

    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setVoiceError(
        "Voice input is not supported in this browser. Try Chrome, Edge, or Safari."
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    finalAnswerRef.current = answer.trim();
    interimRef.current = "";
    setVoiceError("");
    setError("");
    setFeedback(null);
    setInterimTranscript("");
    setElapsedSeconds(0);

    recognition.onresult = (event) => {
      if (recognitionRef.current !== recognition) return;

      let finalChunk = "";
      let interimChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? "";

        if (result?.isFinal) {
          finalChunk += `${transcript} `;
        } else {
          interimChunk += transcript;
        }
      }

      if (finalChunk.trim()) {
        finalAnswerRef.current = [finalAnswerRef.current, finalChunk.trim()]
          .filter(Boolean)
          .join(" ");
      }

      interimRef.current = interimChunk;
      setInterimTranscript(interimChunk.trim());
      setAnswer(
        [finalAnswerRef.current, interimChunk.trim()].filter(Boolean).join(" ")
      );
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;
      if (event.error === "aborted") return;

      setVoiceError(speechErrorMessage(event.error));

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed" ||
        event.error === "audio-capture" ||
        event.error === "network"
      ) {
        stopVoiceInput();
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;

      const pendingInterim = interimRef.current.trim();

      if (pendingInterim) {
        finalAnswerRef.current = [finalAnswerRef.current, pendingInterim]
          .filter(Boolean)
          .join(" ");
      }

      recognitionRef.current = null;
      interimRef.current = "";
      isRecordingRef.current = false;
      setIsRecording(false);
      setInterimTranscript("");
      setAnswer(finalAnswerRef.current.trim());
      clearTimer();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      isRecordingRef.current = true;
      setIsRecording(true);
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        const next = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds((current) => (current === next ? current : next));
      }, 250);
    } catch {
      recognitionRef.current = null;
      isRecordingRef.current = false;
      setIsRecording(false);
      clearTimer();
      setVoiceError("Could not start the microphone. Check your browser permissions.");
    }
  }

  function toggleVoiceInput() {
    if (isRecordingRef.current) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!question?.question) {
      setError("Wait for a question to load first.");
      return;
    }

    if (isRecordingRef.current) {
      setError("Stop the recording before requesting feedback.");
      return;
    }

    if (!answer.trim()) {
      setError("Write or record an answer before requesting feedback.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setFeedback(null);
      setError("You are not logged in. Please log in again.");
      return;
    }

    const storedUser = readStoredUser();
    const role = question.role || storedUser?.targetRole || "";

    setLoading(true);
    setError("");
    setVoiceError("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/ai/evaluate`,
        { question: question.question, answer: answer.trim(), role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFeedback({ ...(data?.data || {}), mock: Boolean(data?.mock) });
      onEvaluated?.(data?.data || null);
    } catch (err) {
      setFeedback(null);
      setError(
        err?.response?.status === 401
          ? "Your session has expired. Please log in again."
          : getErrorMessage(err, "Could not get feedback.")
      );
    } finally {
      setLoading(false);
    }
  }

  const wordCount = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const canUseVoice =
    speechSupported && !questionLoading && !loading && Boolean(question);
  const feedbackScore = feedback
    ? Math.min(100, Math.max(0, Math.round(Number(feedback.score) || 0)))
    : 0;

  return (
    <section className="glass-card relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-24 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl"
      />

      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <IconBadge icon={Mic} />
          <div>
            <h2 className="text-base font-semibold text-white">
              AI mock interview
            </h2>
            <p className="mt-0.5 text-sm text-slate-400">
              Answer by voice or text, then get a score, feedback, and topics to
              review.
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${
            speechSupported
              ? "border-emerald-400/15 bg-emerald-500/10 text-emerald-200"
              : "border-amber-400/15 bg-amber-500/10 text-amber-200"
          }`}
        >
          <Volume2 className="h-3 w-3" />
          {speechSupported ? "Voice ready" : "Voice unavailable"}
        </span>
      </header>

      <form onSubmit={handleSubmit} className="relative mt-5">
        <div className="glass-inset rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <MessageSquareText className="h-3 w-3" />
              Question
            </p>
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {question?.role && (
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {question.role}
                </span>
              )}
              {question?.type && (
                <span className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-200">
                  {question.type}
                </span>
              )}
            </div>
          </div>

          {questionLoading ? (
            <QuestionSkeleton />
          ) : question ? (
            <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">
              {question.question}
            </p>
          ) : (
            <p className="mt-2 text-sm text-rose-300">
              No question loaded. Use “Next question” to try again.
            </p>
          )}
        </div>

        <div
          className={`glass-inset mt-4 rounded-2xl p-4 transition-colors ${
            isRecording ? "border-rose-400/30 bg-rose-500/[0.06]" : ""
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                onClick={toggleVoiceInput}
                disabled={!canUseVoice}
                whileHover={canUseVoice ? { y: -1 } : undefined}
                whileTap={canUseVoice ? { scale: 0.97 } : undefined}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 ${
                  isRecording
                    ? "bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-950/40 hover:brightness-110 focus-visible:ring-rose-400"
                    : "bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-indigo-950/40 hover:brightness-110 focus-visible:ring-indigo-400"
                }`}
              >
                {isRecording ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isRecording ? "Stop recording" : "Start recording"}
              </motion.button>

              <div className="flex items-center gap-2">
                {isRecording ? (
                  <ListeningDot />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-600" />
                )}
                <span
                  className={`font-mono text-lg font-semibold tabular-nums ${
                    isRecording ? "text-rose-300" : "text-slate-200"
                  }`}
                >
                  {formatDuration(elapsedSeconds)}
                </span>
                <span className="text-xs text-slate-500">
                  {isRecording ? "Listening..." : "Voice timer"}
                </span>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <Timer className="h-3 w-3" />
              {speechSupported
                ? "Speech-to-text ready"
                : "Try Chrome, Edge, or Safari"}
            </span>
          </div>

          <AnimatePresence>
            {isRecording && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <ListeningWaveform />
                <p className="mt-1 text-xs text-slate-500">
                  Speak naturally. Your words appear in the answer box below.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {interimTranscript && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-3 rounded-lg border border-cyan-400/15 bg-cyan-500/10 px-3 py-2 text-xs italic text-cyan-200"
              >
                “{interimTranscript}”
              </motion.p>
            )}
          </AnimatePresence>

          {voiceError && (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {voiceError}
            </p>
          )}

          {!speechSupported && (
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-slate-500">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Voice input uses the Web Speech API. You can still type your answer
              below.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <label
            htmlFor="interview-answer"
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
          >
            <MessageSquareText className="h-3 w-3" />
            Your answer
          </label>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {isRecording ? "Voice transcript" : "Text or voice"}
          </span>
        </div>
        <textarea
          id="interview-answer"
          rows={8}
          value={answer}
          onChange={(event) => setAnswer(event.target.value)}
          readOnly={isRecording}
          disabled={questionLoading || loading || !question}
          placeholder={
            isRecording
              ? "Listening... speak your answer."
              : "Use STAR: situation, task, action, result. Include numbers where you can."
          }
          className="premium-input mt-1.5 resize-y py-3"
        />
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>
            {isRecording
              ? "Recording in progress — stop to edit your answer."
              : "Longer, specific answers score better."}
          </span>
          <span>{wordCount} words</span>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-2 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={loading || questionLoading || !question || isRecording}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {loading ? "Evaluating..." : "Get feedback"}
          </button>

          <button
            type="button"
            onClick={() => fetchQuestion(question?.id)}
            disabled={questionLoading || loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-cyan-500/10 hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {questionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {questionLoading ? "Loading question..." : "Next question"}
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {feedback && (
          <motion.div
            key={`${question?.id || "question"}-${feedbackScore}-${feedback.mock ? "mock" : "live"}`}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            role="status"
            aria-live="polite"
            className="relative mt-5 grid gap-5 overflow-hidden rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-600/15 via-slate-900/70 to-slate-950 p-4 sm:grid-cols-[8rem_1fr]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl"
            />

            <div className="relative flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 220,
                  damping: 18,
                  delay: 0.08,
                }}
                className="relative h-28 w-28"
              >
                <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="3"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke={ringColor(feedbackScore)}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${feedbackScore} 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${scoreColor(feedbackScore)}`}>
                    {feedbackScore}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    / 100
                  </span>
                </div>
              </motion.div>

              {feedback.mock && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-2 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Mock feedback
                </motion.span>
              )}
            </div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
              }}
              className="relative space-y-4"
            >
              <FeedbackList
                title="Strengths"
                items={feedback.strengths}
                tone="emerald"
                icon={CheckCircle2}
              />
              <FeedbackList
                title="Improvements"
                items={feedback.improvements}
                tone="amber"
                icon={TriangleAlert}
              />
              <FeedbackList
                title="Recommended topics"
                items={feedback.recommendedTopics}
                tone="blue"
                icon={Lightbulb}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function QuestionSkeleton() {
  return (
    <div className="mt-3 space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

function ListeningDot() {
  return (
    <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full bg-rose-400"
        animate={{ scale: [1, 2.2], opacity: [0.65, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
      />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
    </span>
  );
}

function ListeningWaveform() {
  return (
    <div className="mt-3 flex h-12 items-center gap-1.5" aria-hidden="true">
      {WAVEFORM_HEIGHTS.map((height, index) => (
        <motion.span
          key={index}
          className="w-1.5 rounded-full bg-rose-400/90"
          style={{ height: 28, transformOrigin: "center" }}
          animate={{ scaleY: [0.35, height, 0.55, 0.9, 0.35] }}
          transition={{
            duration: 1.05 + index * 0.07,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.04,
          }}
        />
      ))}
    </div>
  );
}

function FeedbackList({ title, items = [], tone, icon: Icon }) {
  const styles =
    tone === "emerald"
      ? { dot: "bg-emerald-400", text: "text-emerald-300" }
      : tone === "blue"
        ? { dot: "bg-cyan-400", text: "text-cyan-300" }
        : { dot: "bg-amber-400", text: "text-amber-300" };
  const list = Array.isArray(items) ? items : [];

  if (!list.length) return null;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0 },
      }}
    >
      <p
        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${styles.text}`}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </p>
      <motion.ul
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
        className="mt-2 space-y-1.5"
      >
        {list.map((item, index) => (
          <motion.li
            key={`${title}-${index}`}
            variants={{
              hidden: { opacity: 0, x: -6 },
              show: { opacity: 1, x: 0 },
            }}
            className="flex gap-2 text-sm leading-5 text-slate-300"
          >
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
            <span>{item}</span>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}
