import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const ease = [0.22, 1, 0.36, 1];

export function Reveal({ children, className = "", delay = 0, y = 24 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.55, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  number,
  title,
  description,
  icon: Icon = Sparkles,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4, ease }}
      className="mb-3 flex items-start gap-3"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 text-indigo-300 shadow-lg shadow-indigo-950/30">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Step {number}
          </span>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      </div>
    </motion.div>
  );
}

export function Skeleton({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function IconBadge({ icon: Icon = Sparkles, className = "", size = "md" }) {
  const sizes = {
    sm: "h-9 w-9 rounded-xl",
    md: "h-11 w-11 rounded-2xl",
    lg: "h-14 w-14 rounded-2xl",
  };

  return (
    <div
      className={`flex shrink-0 items-center justify-center border border-white/10 bg-gradient-to-br from-indigo-500/20 via-indigo-500/10 to-cyan-500/10 text-indigo-300 shadow-lg shadow-indigo-950/30 ${sizes[size]} ${className}`}
    >
      <Icon className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.8} />
    </div>
  );
}

export function StatPill({ icon: Icon, children, tone = "indigo" }) {
  const tones = {
    indigo: "border-indigo-400/15 bg-indigo-500/10 text-indigo-200",
    emerald: "border-emerald-400/15 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/15 bg-amber-500/10 text-amber-200",
    slate: "border-white/10 bg-white/[0.04] text-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      {Icon && <Icon className="h-3 w-3" strokeWidth={2} />}
      {children}
    </span>
  );
}
