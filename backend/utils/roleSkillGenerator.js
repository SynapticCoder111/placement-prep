const axios = require("axios");
const {
  normalizeTargetRole,
  resolveTargetRole,
  getRoleSkills,
  canonicalizeSkillName,
} = require("./skillExtractor");

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_TIMEOUT_MS = 25000;
const MAX_SKILLS = 10;
const MIN_VALID_SKILLS = 3;

/**
 * Curated offline fallbacks for popular non-IT roles. They keep the feature
 * useful when OPENAI_API_KEY is missing or the AI request fails.
 */
const FALLBACK_ROLE_SKILLS = {
  "Data Scientist": [
    "Python",
    "SQL",
    "Statistics",
    "Machine Learning",
    "Pandas",
    "NumPy",
    "Data Visualization",
    "Feature Engineering",
    "Model Evaluation",
    "Communication",
  ],
  "UI/UX Designer": [
    "Figma",
    "User Research",
    "Wireframing",
    "Prototyping",
    "Interaction Design",
    "Visual Design",
    "Usability Testing",
    "Design Systems",
    "Accessibility",
    "Communication",
  ],
  Marketing: [
    "Digital Marketing",
    "SEO",
    "Content Marketing",
    "Social Media Marketing",
    "Google Analytics",
    "Email Marketing",
    "Brand Strategy",
    "Market Research",
    "Copywriting",
    "Communication",
  ],
  HR: [
    "Recruitment",
    "Employee Relations",
    "HRIS",
    "Onboarding",
    "Performance Management",
    "Labor Law",
    "Compensation & Benefits",
    "Conflict Resolution",
    "Communication",
    "Confidentiality",
  ],
  Teacher: [
    "Lesson Planning",
    "Classroom Management",
    "Curriculum Design",
    "Student Assessment",
    "Differentiated Instruction",
    "Educational Technology",
    "Student Engagement",
    "Communication",
    "Patience",
    "Subject Expertise",
  ],
  Lawyer: [
    "Legal Research",
    "Legal Writing",
    "Contract Law",
    "Litigation",
    "Negotiation",
    "Case Management",
    "Client Counseling",
    "Analytical Reasoning",
    "Attention to Detail",
    "Communication",
  ],
  "Civil Engineer": [
    "AutoCAD",
    "Structural Analysis",
    "Project Management",
    "Construction Management",
    "Surveying",
    "Concrete Design",
    "Environmental Engineering",
    "Cost Estimation",
    "Problem Solving",
    "Communication",
  ],
};

const KEYWORD_FALLBACKS = [
  {
    pattern: /biotech|biomedical|biotechnology|life sciences?/i,
    skills: [
      "Molecular Biology",
      "Cell Culture",
      "PCR",
      "Laboratory Safety",
      "Data Analysis",
      "Research Methods",
      "Quality Control",
      "Documentation",
      "Problem Solving",
      "Communication",
    ],
  },
  {
    pattern: /mechanical/i,
    skills: [
      "AutoCAD",
      "SolidWorks",
      "Thermodynamics",
      "Materials Science",
      "CAD Modeling",
      "Manufacturing Processes",
      "Project Management",
      "Problem Solving",
      "Quality Control",
      "Communication",
    ],
  },
  {
    pattern: /electrical|electronics/i,
    skills: [
      "Circuit Design",
      "MATLAB",
      "Electrical Systems",
      "Power Electronics",
      "PLC Programming",
      "AutoCAD",
      "Troubleshooting",
      "Safety Standards",
      "Problem Solving",
      "Communication",
    ],
  },
  {
    pattern: /finance|accounting|accountant/i,
    skills: [
      "Financial Analysis",
      "Accounting",
      "Excel",
      "Financial Modeling",
      "Budgeting",
      "Taxation",
      "Auditing",
      "Risk Management",
      "Attention to Detail",
      "Communication",
    ],
  },
  {
    pattern: /nurse|nursing|medical|healthcare/i,
    skills: [
      "Patient Care",
      "Clinical Procedures",
      "Medical Terminology",
      "Infection Control",
      "Patient Education",
      "Electronic Health Records",
      "Critical Thinking",
      "Empathy",
      "Communication",
      "Teamwork",
    ],
  },
  {
    pattern: /product manager|product management/i,
    skills: [
      "Product Strategy",
      "Roadmapping",
      "User Research",
      "Agile",
      "Product Analytics",
      "Stakeholder Management",
      "Prioritization",
      "Communication",
      "Problem Solving",
      "Go-to-Market",
    ],
  },
];

const GENERIC_ROLE_SKILLS = [
  "Communication",
  "Problem Solving",
  "Project Management",
  "Research",
  "Data Analysis",
  "Teamwork",
  "Time Management",
  "Critical Thinking",
  "Presentation Skills",
  "Adaptability",
];

function normalizeSkillList(raw) {
  const source = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray(raw.skills)
      ? raw.skills
      : [];

  const seen = new Set();
  const skills = [];

  for (const item of source) {
    if (typeof item !== "string") continue;

    const cleaned = item
      .replace(/^[\s\-*.\d)]+/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned || cleaned.length > 60 || cleaned.split(" ").length > 8) {
      continue;
    }

    const skill = canonicalizeSkillName(cleaned).slice(0, 60);
    const key = skill.toLowerCase();

    if (!skill || seen.has(key)) continue;

    seen.add(key);
    skills.push(skill);

    if (skills.length >= MAX_SKILLS) break;
  }

  return skills;
}

function fallbackSkillsForRole(role) {
  const exactKey = Object.keys(FALLBACK_ROLE_SKILLS).find(
    (key) => key.toLowerCase() === role.toLowerCase()
  );

  if (exactKey) return [...FALLBACK_ROLE_SKILLS[exactKey]];

  const keywordMatch = KEYWORD_FALLBACKS.find(({ pattern }) =>
    pattern.test(role)
  );

  return keywordMatch ? [...keywordMatch.skills] : [...GENERIC_ROLE_SKILLS];
}

function parseSkillResponse(content) {
  if (typeof content !== "string") return [];

  try {
    return normalizeSkillList(JSON.parse(content));
  } catch {
    // The model sometimes wraps the array in prose or a markdown fence.
  }

  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");

  if (start === -1 || end <= start) return [];

  try {
    return normalizeSkillList(JSON.parse(content.slice(start, end + 1)));
  } catch {
    return [];
  }
}

/**
 * Generates the top skills for a custom role.
 *
 * The prompt is intentionally fixed so the model returns a predictable JSON
 * array. If no API key is available, or the response is unusable, the curated
 * fallback profile keeps the gap analysis and roadmap working.
 *
 * @param {string} rawRole
 * @returns {Promise<{role: string, skills: string[], source: "predefined"|"ai"|"fallback"|"none", model: string|null}>}
 */
async function generateRoleSkillsWithAI(rawRole) {
  const role = resolveTargetRole(rawRole);
  const canonical = normalizeTargetRole(role);

  if (canonical) {
    return {
      role: canonical,
      skills: [...getRoleSkills(canonical)],
      source: "predefined",
      model: null,
    };
  }

  if (!role) {
    return { role: "", skills: [], source: "none", model: null };
  }

  const fallback = {
    role,
    skills: fallbackSkillsForRole(role),
    source: "fallback",
    model: null,
  };

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) return fallback;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = `List the top 10 technical and soft skills required for a ${role}. Return ONLY a JSON array of strings.`;

  try {
    const { data } = await axios.post(
      OPENAI_URL,
      {
        model,
        temperature: 0.2,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: OPENAI_TIMEOUT_MS,
      }
    );

    const skills = parseSkillResponse(data?.choices?.[0]?.message?.content);

    if (skills.length < MIN_VALID_SKILLS) {
      console.error(
        `OpenAI returned only ${skills.length} usable skills for custom role "${role}".`
      );
      return fallback;
    }

    return { role, skills, source: "ai", model };
  } catch (err) {
    const status = err.response?.status;
    console.error(
      "generateRoleSkillsWithAI error:",
      status || err.code || err.message
    );
    return fallback;
  }
}

/**
 * Resolves required skills for a role, reusing skills already saved on the
 * user when the role has not changed. Fallback results are refreshed once an
 * API key becomes available.
 */
async function resolveRoleSkills({ role, user = null } = {}) {
  const resolvedRole = resolveTargetRole(role);
  const canonical = normalizeTargetRole(resolvedRole);

  if (canonical) {
    return {
      role: canonical,
      skills: [...getRoleSkills(canonical)],
      source: "predefined",
      model: null,
    };
  }

  if (!resolvedRole) {
    return { role: "", skills: [], source: "none", model: null };
  }

  const storedRole = resolveTargetRole(user?.targetRole);
  const storedSkills = normalizeSkillList(user?.targetRoleSkills);
  const storedSource =
    typeof user?.targetRoleSkillsSource === "string"
      ? user.targetRoleSkillsSource
      : "";
  const sameRole =
    storedRole && storedRole.toLowerCase() === resolvedRole.toLowerCase();
  const refreshFallback =
    storedSource === "fallback" && Boolean(process.env.OPENAI_API_KEY);

  if (sameRole && storedSkills.length > 0 && !refreshFallback) {
    return {
      role: resolvedRole,
      skills: storedSkills,
      source: storedSource || "stored",
      model: null,
    };
  }

  return generateRoleSkillsWithAI(resolvedRole);
}

module.exports = {
  FALLBACK_ROLE_SKILLS,
  GENERIC_ROLE_SKILLS,
  normalizeSkillList,
  fallbackSkillsForRole,
  parseSkillResponse,
  generateRoleSkillsWithAI,
  resolveRoleSkills,
};
