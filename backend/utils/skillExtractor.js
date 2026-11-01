/**
 * Skill extraction and gap analysis for the placement-prep system.
 *
 * - A dictionary of 30+ skills with aliases (regex/token-boundary matching).
 * - Role profiles for Frontend, Backend, Full Stack, Software Engineer and
 *   Data Analyst.
 * - Detailed, priority-aware missing-skill metadata used by the AI gap result.
 * - Generic role titles fall back to the Full Stack profile.
 */

const SKILLS = [
  // Frontend
  { name: "HTML", aliases: ["html", "html5"] },
  { name: "CSS", aliases: ["css", "css3"] },
  { name: "JavaScript", aliases: ["javascript", "js", "es6", "ecmascript"] },
  { name: "TypeScript", aliases: ["typescript", "ts"] },
  { name: "React", aliases: ["react", "react.js", "reactjs"] },
  { name: "Next.js", aliases: ["next.js", "nextjs", "next js"] },
  { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss", "tailwind css"] },
  { name: "Redux", aliases: ["redux"] },

  // Backend
  { name: "Node.js", aliases: ["node", "node.js", "nodejs"] },
  { name: "Express", aliases: ["express", "express.js", "expressjs"] },
  { name: "REST API", aliases: ["rest api", "rest apis", "restful", "restful api"] },
  { name: "GraphQL", aliases: ["graphql"] },
  { name: "Python", aliases: ["python"] },
  { name: "Java", aliases: ["java"] },
  { name: "C++", aliases: ["c++"] },
  { name: "C#", aliases: ["c#"] },

  // Databases
  { name: "MongoDB", aliases: ["mongodb", "mongo"] },
  { name: "Mongoose", aliases: ["mongoose"] },
  { name: "SQL", aliases: ["sql"] },
  { name: "MySQL", aliases: ["mysql"] },
  { name: "PostgreSQL", aliases: ["postgresql", "postgres"] },

  // Data analytics
  { name: "Excel", aliases: ["excel", "ms excel", "microsoft excel"] },
  { name: "Power BI", aliases: ["power bi", "powerbi", "power-bi"] },
  { name: "Statistics", aliases: ["statistics", "statistical", "statistical analysis", "stats"] },

  // Computer science fundamentals
  { name: "DSA", aliases: ["dsa", "data structures", "data structure", "data structures and algorithms", "algorithms"] },
  { name: "OOP", aliases: ["oop", "object oriented programming", "object-oriented programming"] },
  { name: "DBMS", aliases: ["dbms", "database management system", "database management systems"] },
  { name: "Operating Systems", aliases: ["operating system", "operating systems", "os"] },
  { name: "System Design", aliases: ["system design", "system designing", "software design"] },

  // Tooling / cloud
  { name: "Git", aliases: ["git"] },
  { name: "GitHub", aliases: ["github"] },
  { name: "Docker", aliases: ["docker"] },
  { name: "AWS", aliases: ["aws", "amazon web services"] },
  { name: "Linux", aliases: ["linux", "unix"] },
];

/**
 * Required skills per target role. These are canonical names from SKILLS.
 */
const ROLE_SKILLS = {
  "Frontend Developer": ["HTML", "CSS", "JavaScript", "React", "Git"],
  "Backend Developer": ["Node.js", "Express", "MongoDB", "REST API", "Git"],
  "Full Stack Developer": ["React", "Node.js", "MongoDB", "JavaScript", "Git"],
  "Software Engineer": ["DSA", "JavaScript", "React", "Node.js", "DBMS", "Git"],
  "Data Analyst": ["SQL", "Python", "Excel", "Power BI", "Statistics"],
};

/**
 * Generic job titles map to the Full Stack profile.
 */
const DEFAULT_ROLE_SKILLS = ROLE_SKILLS["Full Stack Developer"];

/**
 * Accepted spellings for each target role.
 */
const ROLE_ALIASES = new Map([
  ["frontend", "Frontend Developer"],
  ["front end", "Frontend Developer"],
  ["frontend developer", "Frontend Developer"],
  ["front-end developer", "Frontend Developer"],
  ["backend", "Backend Developer"],
  ["back end", "Backend Developer"],
  ["backend developer", "Backend Developer"],
  ["back-end developer", "Backend Developer"],
  ["full stack", "Full Stack Developer"],
  ["full-stack", "Full Stack Developer"],
  ["fullstack", "Full Stack Developer"],
  ["full stack developer", "Full Stack Developer"],
  ["full-stack developer", "Full Stack Developer"],
  ["software engineer", "Software Engineer"],
  ["software developer", "Software Engineer"],
  ["software engineering", "Software Engineer"],
  ["software engineer i", "Software Engineer"],
  ["sde", "Software Engineer"],
  ["sde 1", "Software Engineer"],
  ["sde-1", "Software Engineer"],
  ["data analyst", "Data Analyst"],
  ["data analysis", "Data Analyst"],
  ["data analytics", "Data Analyst"],
]);

/**
 * Priority metadata used when the LLM is unavailable or returns a partial
 * response. Reasons are intentionally short enough to fit in a UI badge.
 */
const SKILL_INSIGHTS = {
  HTML: {
    severity: "High",
    reason: "Fundamental for frontend roles and needed to build accessible interfaces.",
  },
  CSS: {
    severity: "High",
    reason: "Essential for responsive layouts, styling, and frontend interviews.",
  },
  JavaScript: {
    severity: "High",
    reason: "Core language for frontend and full-stack interviews; expect live coding.",
  },
  TypeScript: {
    severity: "Medium",
    reason: "Common in modern teams and often expected alongside React or Node.js.",
  },
  React: {
    severity: "High",
    reason: "Core frontend library; expect components, hooks, and state questions.",
  },
  "Next.js": {
    severity: "Medium",
    reason: "Common in production React teams; practice routing and data fetching.",
  },
  "Tailwind CSS": {
    severity: "Low",
    reason: "Useful for fast UI work; learn it alongside a React project.",
  },
  Redux: {
    severity: "Medium",
    reason: "Frequently requested for larger React applications and state questions.",
  },
  "Node.js": {
    severity: "High",
    reason: "Core backend runtime; used for APIs and full-stack project interviews.",
  },
  Express: {
    severity: "High",
    reason: "Common Node.js framework; expect routing, middleware, and REST questions.",
  },
  "REST API": {
    severity: "High",
    reason: "API design is a standard backend and full-stack interview topic.",
  },
  GraphQL: {
    severity: "Low",
    reason: "A useful differentiator; learn it after REST fundamentals.",
  },
  Python: {
    severity: "High",
    reason: "Core language for data and backend roles; expect coding and data tasks.",
  },
  Java: {
    severity: "High",
    reason: "Core language for many backend and software engineering roles.",
  },
  "C++": {
    severity: "Medium",
    reason: "Common in DSA-heavy interviews and systems-oriented roles.",
  },
  "C#": {
    severity: "Medium",
    reason: "Common in enterprise backend roles; practice OOP and async code.",
  },
  MongoDB: {
    severity: "Medium",
    reason: "Frequently used with Node.js; practice schemas, queries, and indexing.",
  },
  Mongoose: {
    severity: "Medium",
    reason: "Expected with MongoDB projects; know schemas, validation, and population.",
  },
  SQL: {
    severity: "High",
    reason: "Core data skill for analyst and backend interviews; expect joins and aggregations.",
  },
  MySQL: {
    severity: "Medium",
    reason: "Common relational database; practice joins, indexes, and transactions.",
  },
  PostgreSQL: {
    severity: "Medium",
    reason: "Common relational database; practice joins, indexes, and transactions.",
  },
  Excel: {
    severity: "Medium",
    reason: "Common analyst tool; practice pivot tables, lookups, and dashboards.",
  },
  "Power BI": {
    severity: "Medium",
    reason: "Expected for many analyst roles; build at least one dashboard project.",
  },
  Statistics: {
    severity: "High",
    reason: "Needed for hypothesis testing, experiment analysis, and analyst interviews.",
  },
  DSA: {
    severity: "High",
    reason: "Needed for coding interviews, problem-solving rounds, and most software screens.",
  },
  OOP: {
    severity: "High",
    reason: "Common interview topic; practice classes, inheritance, and SOLID principles.",
  },
  DBMS: {
    severity: "High",
    reason: "Frequently assessed in CS fundamentals interviews; learn normalization and indexing.",
  },
  "Operating Systems": {
    severity: "Medium",
    reason: "Common in CS fundamentals rounds; focus on processes, memory, and deadlocks.",
  },
  "System Design": {
    severity: "High",
    reason: "Expected in software engineering interviews; practice scalable component design.",
  },
  Git: {
    severity: "Medium",
    reason: "Expected in team workflows; explain branching, merging, and pull requests.",
  },
  GitHub: {
    severity: "Low",
    reason: "Useful for showing projects and collaborating; strengthen your profile and PR workflow.",
  },
  Docker: {
    severity: "Low",
    reason: "Valuable for deployment-focused roles; add it after core language skills.",
  },
  AWS: {
    severity: "Low",
    reason: "A differentiator for cloud roles; learn it after core development skills.",
  },
  Linux: {
    severity: "Low",
    reason: "Useful for backend and DevOps work; practice common commands and permissions.",
  },
};

const SEVERITY_RANK = { High: 0, Medium: 1, Low: 2 };

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Token-boundary test that also works for aliases containing symbols
 * (c++, c#, node.js).
 *
 * The left boundary excludes "." so the "js" alias does not match inside
 * "Node.js" and report JavaScript for a Node-only resume.
 */
function containsAlias(haystack, alias) {
  const pattern = new RegExp(
    `(^|[^a-z0-9.])${escapeRegExp(alias.toLowerCase())}(?=$|[^a-z0-9])`,
    "i"
  );
  return pattern.test(haystack);
}

/**
 * Returns the canonical skill names found in `text`, in SKILLS order.
 * This is the regex/dictionary "NLP-like" extraction used on resumes.
 */
function extractSkills(text) {
  if (typeof text !== "string" || !text.trim()) return [];

  const haystack = text.toLowerCase();
  return SKILLS.filter(({ aliases }) =>
    aliases.some((alias) => containsAlias(haystack, alias))
  ).map((skill) => skill.name);
}

/**
 * Normalizes "frontend", "Front End", "Full Stack", etc. to a canonical role.
 * Returns null when the value is not a supported role.
 */
function normalizeTargetRole(role) {
  if (typeof role !== "string") return null;

  const key = role.trim().toLowerCase().replace(/\s+/g, " ");
  return ROLE_ALIASES.get(key) || null;
}

/**
 * Resolves a role to its canonical preset when possible, otherwise keeps the
 * user's custom role label. This is what allows roles such as "Biotech
 * Engineer" to flow through the system instead of silently becoming Full
 * Stack Developer.
 *
 * @param {string} role
 * @returns {string}
 */
function resolveTargetRole(role) {
  if (typeof role !== "string") return "";

  const cleaned = role
    .replace(/[\u0000-\u001f]/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);

  if (!cleaned) return "";

  // The frontend sends the actual custom role, but guard against a literal
  // placeholder value being sent by older clients.
  if (/^other(\s*\(.*\))?$/i.test(cleaned)) return "";

  return normalizeTargetRole(cleaned) || cleaned;
}

/**
 * Returns the required skills for a role, or [] for an unknown role.
 */
function getRoleSkills(role) {
  const canonical = normalizeTargetRole(role);
  return canonical ? [...ROLE_SKILLS[canonical]] : [];
}

/**
 * Detects the role a job description is about. Handles exact titles and
 * titles embedded in a longer description.
 */
function detectRole(jobDesc) {
  if (typeof jobDesc !== "string" || !jobDesc.trim()) return null;

  const exact = normalizeTargetRole(jobDesc);
  if (exact) return exact;

  if (/\bfront[\s-]?end\b/i.test(jobDesc)) return "Frontend Developer";
  if (/\bback[\s-]?end\b/i.test(jobDesc)) return "Backend Developer";
  if (/\bfull[\s-]?stack\b/i.test(jobDesc)) return "Full Stack Developer";
  if (/\bdata\s+analyst\b/i.test(jobDesc)) return "Data Analyst";

  if (
    /\bsoftware\s+(developer|engineer)\b/i.test(jobDesc) ||
    /\bsoftware\s+engineering\b/i.test(jobDesc) ||
    /\bsde\b/i.test(jobDesc)
  ) {
    return "Software Engineer";
  }

  if (/\bweb\s+developer\b/i.test(jobDesc) || /\bmern\b/i.test(jobDesc)) {
    return "Full Stack Developer";
  }

  return null;
}

/**
 * True when the job description points at a generic role rather than a list
 * of concrete skills.
 */
function isGenericRole(jobDesc) {
  return detectRole(jobDesc) !== null;
}

/**
 * Returns the skills a job description is compared against.
 *
 * - Exact/embedded role titles use that role's profile.
 * - Any concrete skills mentioned are merged in.
 * - Non-role descriptions use only the skills they mention.
 */
function getJobSkills(jobDesc) {
  const detected = extractSkills(jobDesc);
  const role = detectRole(jobDesc);

  if (!role) return detected;

  const required = getRoleSkills(role);
  for (const skill of detected) {
    if (!required.includes(skill)) required.push(skill);
  }
  return required;
}

/**
 * Compares resume text against job-description text (kept for backward
 * compatibility with earlier callers/tests).
 */
function compareSkills(resumeText, jobDesc) {
  const extractedJdSkills = getJobSkills(jobDesc);
  const resumeSkills = new Set(extractSkills(resumeText));

  const matchedSkills = extractedJdSkills.filter((skill) => resumeSkills.has(skill));
  const missingSkills = extractedJdSkills.filter((skill) => !resumeSkills.has(skill));

  const matchPercentage =
    extractedJdSkills.length === 0
      ? 0
      : Math.round((matchedSkills.length / extractedJdSkills.length) * 100);

  return { matchedSkills, missingSkills, matchPercentage, extractedJdSkills };
}

/**
 * Core gap analysis used by the API.
 *
 * Readiness score is the percentage of role requirements met. It is returned
 * separately so the UI can present it as a distinct readiness gauge.
 *
 * @param {string[]} resumeSkills Skills extracted from the resume.
 * @param {string[]} requiredSkills Skills required by the role or JD.
 * @returns {{
 *   matched: string[],
 *   missing: string[],
 *   matchPercentage: number,
 *   readinessScore: number
 * }}
 */
function analyzeRoleGap(resumeSkills = [], requiredSkills = []) {
  const resumeSet = new Set(Array.isArray(resumeSkills) ? resumeSkills : []);
  const required = Array.isArray(requiredSkills) ? requiredSkills : [];

  const matched = required.filter((skill) => resumeSet.has(skill));
  const missing = required.filter((skill) => !resumeSet.has(skill));

  const matchPercentage =
    required.length === 0 ? 0 : Math.round((matched.length / required.length) * 100);

  return {
    matched,
    missing,
    matchPercentage,
    readinessScore: matchPercentage,
  };
}

function canonicalizeSkillName(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  const lower = value.trim().toLowerCase();
  const exact = SKILLS.find((skill) => skill.name.toLowerCase() === lower);
  if (exact) return exact.name;

  const aliasMatch = SKILLS.find((skill) =>
    skill.aliases.some((alias) => alias.toLowerCase() === lower)
  );
  return aliasMatch ? aliasMatch.name : value.trim();
}

function normalizeSeverity(value) {
  if (typeof value !== "string") return null;

  const lower = value.trim().toLowerCase();
  if (lower === "high" || lower === "critical") return "High";
  if (lower === "medium" || lower === "moderate") return "Medium";
  if (lower === "low") return "Low";
  return null;
}

function getSkillInsight(skill, role) {
  const canonical = canonicalizeSkillName(skill);
  const key = Object.keys(SKILL_INSIGHTS).find(
    (item) => item.toLowerCase() === canonical.toLowerCase()
  );

  if (key) return { ...SKILL_INSIGHTS[key] };

  return {
    severity: "Medium",
    reason: `Commonly expected for ${role || "this role"}; strengthen it with a small project.`,
  };
}

/**
 * Converts missing skill names (or partial AI objects) into the detailed
 * contract used by the API and both frontend components.
 *
 * @param {Array<string|{skill?: string, name?: string, severity?: string, reason?: string}>} missingSkills
 * @param {string} role
 * @returns {Array<{skill: string, severity: "High"|"Medium"|"Low", reason: string}>}
 */
function buildMissingSkillDetails(missingSkills = [], role = "") {
  if (!Array.isArray(missingSkills)) return [];

  const seen = new Set();
  const details = [];

  for (const item of missingSkills) {
    const rawSkill =
      typeof item === "string"
        ? item
        : item && typeof item === "object"
          ? item.skill ?? item.name
          : "";

    const skill = canonicalizeSkillName(rawSkill);
    if (!skill) continue;

    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const insight = getSkillInsight(skill, role);
    const providedSeverity =
      item && typeof item === "object" ? normalizeSeverity(item.severity) : null;
    const providedReason =
      item && typeof item === "object" && typeof item.reason === "string"
        ? item.reason.trim()
        : "";

    details.push({
      skill,
      severity: providedSeverity || insight.severity,
      reason: (providedReason || insight.reason).slice(0, 180),
    });
  }

  return details.sort(
    (a, b) => (SEVERITY_RANK[a.severity] ?? 1) - (SEVERITY_RANK[b.severity] ?? 1)
  );
}

module.exports = {
  SKILLS,
  ROLE_SKILLS,
  DEFAULT_ROLE_SKILLS,
  SKILL_INSIGHTS,
  SEVERITY_RANK,
  extractSkills,
  normalizeTargetRole,
  resolveTargetRole,
  getRoleSkills,
  detectRole,
  isGenericRole,
  getJobSkills,
  compareSkills,
  analyzeRoleGap,
  canonicalizeSkillName,
  normalizeSeverity,
  getSkillInsight,
  buildMissingSkillDetails,
  // Kept as an alias so older imports keep working.
  analyzeGap: compareSkills,
};
