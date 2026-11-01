/**
 * Personalized preparation roadmaps.
 *
 * Each missing skill maps to a short, ordered list of actions a student can
 * check off. Unknown skills get a generic three-step plan so the API always
 * returns something useful.
 *
 * Two shapes are exported:
 * - generateRoadmap(missingSkills): legacy skill-by-skill checklist
 * - generateMonthlyRoadmap(missingSkills, role): month1/month2/month3 plan
 *   used by the timeline UI and the detailed gap response.
 */

const SKILL_ROADMAPS = {
  // Frontend
  HTML: [
    "Learn semantic HTML tags",
    "Practice forms and accessibility",
    "Build a multi-page profile site",
  ],
  CSS: [
    "Learn the box model and selectors",
    "Master Flexbox and Grid",
    "Build a responsive landing page",
  ],
  JavaScript: [
    "Learn syntax, functions and arrays",
    "Practice DOM events and async/await",
    "Build 3 small browser projects",
  ],
  TypeScript: [
    "Learn types, interfaces and unions",
    "Practice generics and utility types",
    "Convert a small JavaScript app to TypeScript",
  ],
  React: [
    "Learn JSX",
    "Understand State/Props",
    "Build a Todo App",
  ],
  "Next.js": [
    "Learn file-based routing and layouts",
    "Practice server/client components and data fetching",
    "Build and deploy a multi-page app",
  ],
  "Tailwind CSS": [
    "Learn utility classes and responsive prefixes",
    "Build reusable component styles",
    "Rebuild a landing page with Tailwind",
  ],
  Redux: [
    "Learn the store, actions and reducers",
    "Practice Redux Toolkit slices",
    "Connect Redux to a React app",
  ],

  // Backend
  "Node.js": [
    "Learn modules, fs and npm",
    "Build an HTTP server with routing",
    "Add authentication and error handling",
  ],
  Express: [
    "Learn routing and middleware",
    "Build a CRUD REST API",
    "Add validation and centralized error handling",
  ],
  "REST API": [
    "Learn HTTP verbs and status codes",
    "Design resource-based endpoints",
    "Test your API with Postman",
  ],
  GraphQL: [
    "Learn schemas, queries and mutations",
    "Write resolvers",
    "Connect Apollo Client to React",
  ],
  Python: [
    "Learn syntax and core data structures",
    "Practice functions, files and modules",
    "Build a small automation script",
  ],
  Java: [
    "Learn OOP syntax and collections",
    "Practice exception handling and streams",
    "Build a console application",
  ],
  "C++": [
    "Learn syntax, pointers and references",
    "Practice STL containers and algorithms",
    "Solve 30 DSA problems in C++",
  ],
  "C#": [
    "Learn OOP syntax and collections",
    "Practice LINQ and async/await",
    "Build a small console or web app",
  ],

  // Databases
  MongoDB: [
    "Learn documents and collections",
    "Practice Mongoose schemas and CRUD",
    "Add indexes and relationships",
  ],
  Mongoose: [
    "Learn schemas and models",
    "Practice validation and middleware",
    "Build CRUD with population",
  ],
  SQL: [
    "Learn SELECT, WHERE and JOINs",
    "Practice GROUP BY and subqueries",
    "Solve 30 SQL query exercises",
  ],
  MySQL: [
    "Learn tables, keys and indexes",
    "Practice joins and transactions",
    "Build a small normalized database",
  ],
  PostgreSQL: [
    "Learn tables, keys and indexes",
    "Practice joins and transactions",
    "Build a small normalized database",
  ],

  // Data analytics
  Excel: [
    "Learn formulas and cell references",
    "Master pivot tables and charts",
    "Build a summary dashboard",
  ],
  "Power BI": [
    "Connect and clean your data",
    "Learn visuals and filters",
    "Write basic DAX and publish a dashboard",
  ],
  Statistics: [
    "Learn mean, median, variance and distributions",
    "Practice probability and hypothesis testing",
    "Analyze a real dataset and write conclusions",
  ],

  // Computer science fundamentals
  DSA: [
    "Learn Arrays/Strings",
    "Practice 50 LeetCode Easy",
    "Learn Trees/Graphs",
  ],
  OOP: [
    "Learn classes, objects and encapsulation",
    "Practice inheritance and polymorphism",
    "Apply SOLID principles in a small project",
  ],
  DBMS: [
    "Learn normalization and keys",
    "Practice transactions and indexes",
    "Design a schema for a sample app",
  ],
  "Operating Systems": [
    "Learn processes, threads and scheduling",
    "Study memory management and deadlocks",
    "Practice common OS interview questions",
  ],
  "System Design": [
    "Learn load balancing, caching and databases",
    "Practice designing a URL shortener",
    "Review scalability trade-offs and common patterns",
  ],

  // Tooling / cloud
  Git: [
    "Learn init, add, commit and status",
    "Practice branching, merging and rebasing",
    "Resolve a merge conflict confidently",
  ],
  GitHub: [
    "Create a clean profile and repositories",
    "Practice branches, pull requests and reviews",
    "Contribute to an open-source issue",
  ],
  Docker: [
    "Learn images, containers and volumes",
    "Write a Dockerfile for an app",
    "Run a multi-service app with Compose",
  ],
  AWS: [
    "Learn EC2, S3 and IAM basics",
    "Deploy a small app to the cloud",
    "Practice core AWS interview questions",
  ],
  Linux: [
    "Learn files, permissions and processes",
    "Practice pipes, grep and package managers",
    "Write a small shell script",
  ],
};

const MONTH_KEYS = ["month1", "month2", "month3"];

const FOUNDATION_SKILLS = new Set([
  "HTML",
  "CSS",
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "SQL",
  "Excel",
  "Git",
  "GitHub",
  "Linux",
]);

const BUILD_SKILLS = new Set([
  "React",
  "Next.js",
  "Tailwind CSS",
  "Redux",
  "Node.js",
  "Express",
  "REST API",
  "GraphQL",
  "MongoDB",
  "Mongoose",
  "MySQL",
  "PostgreSQL",
  "Power BI",
  "Docker",
  "AWS",
]);

const INTERVIEW_SKILLS = new Set([
  "DSA",
  "OOP",
  "DBMS",
  "Operating Systems",
  "System Design",
  "Statistics",
]);

function findRoadmapSteps(skill) {
  if (SKILL_ROADMAPS[skill]) return SKILL_ROADMAPS[skill];

  const caseInsensitiveKey = Object.keys(SKILL_ROADMAPS).find(
    (key) => key.toLowerCase() === skill.toLowerCase()
  );

  return caseInsensitiveKey ? SKILL_ROADMAPS[caseInsensitiveKey] : null;
}

function fallbackSteps(skill) {
  return [
    `Learn the fundamentals of ${skill}`,
    `Complete a hands-on ${skill} tutorial`,
    `Build a small project using ${skill}`,
  ];
}

function normalizeMissingSkills(missingSkills = []) {
  if (!Array.isArray(missingSkills)) return [];

  const seen = new Set();

  return missingSkills
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

function formatList(items) {
  if (items.length <= 1) return items[0] || "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function addUnique(target, value) {
  if (value && !target.some((item) => item.toLowerCase() === value.toLowerCase())) {
    target.push(value);
  }
}

function monthIndexForSkill(skill) {
  if (FOUNDATION_SKILLS.has(skill)) return 0;
  if (BUILD_SKILLS.has(skill)) return 1;
  if (INTERVIEW_SKILLS.has(skill)) return 2;
  return 1;
}

function actionForSkill(skill) {
  const steps = findRoadmapSteps(skill) || fallbackSteps(skill);
  return `${skill}: ${steps[0]}`;
}

/**
 * Builds the month-by-month plan used by the new timeline UI.
 *
 * Month 1 focuses on language/foundation skills, month 2 on frameworks,
 * APIs and databases, and month 3 on interview fundamentals plus a
 * portfolio project and mock interviews.
 *
 * @param {Array<string|{skill: string}>} missingSkills
 * @param {string} role
 * @returns {{month1: string[], month2: string[], month3: string[]}}
 */
function generateMonthlyRoadmap(missingSkills = [], role = "") {
  const skills = normalizeMissingSkills(missingSkills);

  if (skills.length === 0) {
    return { month1: [], month2: [], month3: [] };
  }

  const buckets = [[], [], []];

  for (const skill of skills) {
    const monthIndex = monthIndexForSkill(skill);
    addUnique(buckets[monthIndex], actionForSkill(skill));
  }

  if (buckets[0].length === 0) {
    buckets[0].push(
      `Refresh the fundamentals required for ${role || "your target role"}`
    );
  }

  if (buckets[1].length === 0) {
    buckets[1].push(
      `Build a small ${role || "role-specific"} feature and review the concepts you used`
    );
  }

  const projectSkills = skills.slice(0, 3);
  const projectAction = projectSkills.length
    ? `Build a portfolio project using ${formatList(projectSkills)}`
    : "Build one portfolio-ready project";

  const month3Core = buckets[2].slice(0, 4);
  const month3 = [...month3Core];

  addUnique(month3, projectAction);
  addUnique(month3, "Complete 2 mock interviews and review the feedback");

  return {
    month1: buckets[0].slice(0, 5),
    month2: buckets[1].slice(0, 5),
    month3: month3.slice(0, 6),
  };
}

/**
 * Builds a grouped, checklist-ready roadmap from a list of missing skills.
 *
 * @param {string[]} missingSkills Canonical skill names from the gap analysis.
 * @returns {Array<{ skill: string, steps: string[] }>}
 */
function generateRoadmap(missingSkills = []) {
  const skills = normalizeMissingSkills(missingSkills);

  return skills.map((skill) => {
    const steps = findRoadmapSteps(skill) || fallbackSteps(skill);
    return { skill, steps: [...steps] };
  });
}

module.exports = {
  SKILL_ROADMAPS,
  MONTH_KEYS,
  generateRoadmap,
  generateMonthlyRoadmap,
};
