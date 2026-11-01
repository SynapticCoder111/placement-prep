const fs = require("fs/promises");
const { PDFParse } = require("pdf-parse");
const User = require("../models/User");
const {
  extractSkills,
  resolveTargetRole,
  getJobSkills,
  analyzeRoleGap,
  buildMissingSkillDetails,
} = require("../utils/skillExtractor");
const { resolveRoleSkills } = require("../utils/roleSkillGenerator");
const {
  generateRoadmap: buildRoadmap,
  generateMonthlyRoadmap,
} = require("../utils/roadmapGenerator");

const MAX_RESUME_CHARS = 200000;

// Delete the file once it has been parsed so resumes are not left on disk.
// Set to false if you also want to keep the original PDFs in uploads/.
const DELETE_FILE_AFTER_PARSE = true;

const DEFAULT_TARGET_ROLE = "Full Stack Developer";

function cleanText(raw) {
  return String(raw || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeMissingInput(value) {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  const details = [];

  for (const item of value) {
    const skill =
      typeof item === "string"
        ? item.trim()
        : item && typeof item === "object" && typeof item.skill === "string"
          ? item.skill.trim()
          : "";

    if (!skill || seen.has(skill.toLowerCase())) continue;
    seen.add(skill.toLowerCase());

    details.push(
      item && typeof item === "object"
        ? {
            skill,
            severity: item.severity,
            reason: item.reason,
          }
        : { skill }
    );
  }

  return details;
}

/* -------------------------------------------------------------------------
   POST /api/resume/upload  (protected, multipart field: "resume")
   Optional multipart field: "targetRole"
   ------------------------------------------------------------------------- */
async function uploadResume(req, res) {
  const file = req.file;
  const userId = req.user?.id;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded. Attach a PDF using the field name 'resume'.",
    });
  }

  const rawTargetRole =
    typeof req.body?.targetRole === "string" ? req.body.targetRole.trim() : "";
  const targetRole = resolveTargetRole(rawTargetRole) || DEFAULT_TARGET_ROLE;

  try {
    const buffer = await fs.readFile(file.path);

    // The MIME type is client-supplied; every real PDF starts with "%PDF-".
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return res.status(400).json({
        success: false,
        message: "That file is not a valid PDF.",
      });
    }

    const parser = new PDFParse({ data: buffer });
    let extracted = "";

    try {
      const result = await parser.getText();
      extracted = result?.text || "";
    } finally {
      await parser.destroy();
    }

    const resumeText = cleanText(extracted);

    if (!resumeText) {
      return res.status(422).json({
        success: false,
        message:
          "No text could be extracted. The PDF may be scanned or image-only; upload a text-based PDF.",
      });
    }

    const savedText = resumeText.slice(0, MAX_RESUME_CHARS);

    // Regex/dictionary extraction over the parsed resume text.
    const resumeSkills = extractSkills(savedText);

    // Preset roles reuse the curated profile. Unknown/custom roles get an
    // AI-generated profile, with a curated fallback when OpenAI is unavailable.
    const roleProfile = await resolveRoleSkills({ role: targetRole });
    const resolvedTargetRole = roleProfile.role || targetRole;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        resumeText: savedText,
        resumeSkills,
        // Legacy alias used by the dashboard's skills strip.
        skills: resumeSkills,
        targetRole: resolvedTargetRole,
        targetRoleSkills: roleProfile.skills,
        targetRoleSkillsSource: roleProfile.source,
      },
      { returnDocument: "after", runValidators: true }
    ).select(
      "name email skills resumeSkills targetRole targetRoleSkills targetRoleSkillsSource"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      message: "Resume uploaded and parsed successfully.",
      data: {
        fileName: file.originalname,
        characters: savedText.length,
        truncated: resumeText.length > MAX_RESUME_CHARS,
        targetRole: user.targetRole,
        targetRoleSkills: user.targetRoleSkills,
        targetRoleSkillsSource: user.targetRoleSkillsSource,
        resumeSkills: user.resumeSkills,
        // Legacy alias for the existing skills strip.
        skills: user.resumeSkills,
        preview: savedText.slice(0, 300),
      },
    });
  } catch (err) {
    console.error("uploadResume error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Could not process the resume. Please try again.",
    });
  } finally {
    if (DELETE_FILE_AFTER_PARSE) {
      await fs.unlink(file.path).catch(() => {});
    }
  }
}

/* -------------------------------------------------------------------------
   POST /api/resume/roadmap  (protected)
   Body: {
     "missingSkills": ["React"],          // optional: reuse the latest analysis
     "jobDescription": "optional",
     "targetRole": "optional override"
   }

   missingSkills also accepts the detailed objects returned by
   /api/resume/analyze: [{ skill, severity, reason }].

   Response:
   {
     missingSkills: [{ skill, severity, reason }],
     roadmap: { month1: string[], month2: string[], month3: string[] },
     skillRoadmap: [{ skill, steps }] // legacy checklist
   }
   ------------------------------------------------------------------------- */
async function generateRoadmap(req, res) {
  const providedMissingSkills = Array.isArray(req.body?.missingSkills)
    ? normalizeMissingInput(req.body.missingSkills)
    : null;
  const jobDescription =
    typeof req.body?.jobDescription === "string"
      ? req.body.jobDescription.trim()
      : "";
  const requestedRole =
    typeof req.body?.targetRole === "string" ? req.body.targetRole.trim() : "";

  try {
    const user = await User.findById(req.user.id).select(
      "resumeSkills skills targetRole targetRoleSkills targetRoleSkillsSource"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const targetRole =
      resolveTargetRole(requestedRole) || resolveTargetRole(user.targetRole);

    let missingInput = [];
    let requiredSkills = [];
    let requiredSkillsSource = "provided";
    let roleSkillsModel = null;
    let source = "provided";

    if (providedMissingSkills !== null) {
      missingInput = providedMissingSkills;
    } else {
      const resumeSkills =
        Array.isArray(user.resumeSkills) && user.resumeSkills.length > 0
          ? user.resumeSkills
          : Array.isArray(user.skills)
            ? user.skills
            : [];

      if (resumeSkills.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Upload a resume before generating a preparation roadmap.",
        });
      }

      // A custom JD takes priority when it contains recognizable skills.
      if (jobDescription) {
        const jobSkills = getJobSkills(jobDescription);
        if (jobSkills.length > 0) {
          requiredSkills = jobSkills;
          requiredSkillsSource = "jobDescription";
          source = "jobDescription";
        }
      }

      if (requiredSkills.length === 0 && targetRole) {
        const roleProfile = await resolveRoleSkills({ role: targetRole, user });
        requiredSkills = roleProfile.skills;
        requiredSkillsSource = roleProfile.source;
        roleSkillsModel = roleProfile.model || null;
        source = "targetRole";
      }

      if (requiredSkills.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Select a target role or provide a job description with recognized skills.",
        });
      }

      missingInput = analyzeRoleGap(resumeSkills, requiredSkills).missing;
    }

    const missingSkills = buildMissingSkillDetails(
      missingInput,
      targetRole || ""
    );
    const missingSkillNames = missingSkills.map((item) => item.skill);
    const skillRoadmap = buildRoadmap(missingSkillNames);
    const roadmap = generateMonthlyRoadmap(
      missingSkills,
      targetRole || "your target role"
    );
    const totalSteps = ["month1", "month2", "month3"].reduce(
      (total, key) => total + roadmap[key].length,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        targetRole: targetRole || null,
        missingSkills,
        missingSkillNames,
        roadmap,
        // Legacy skill-by-skill checklist retained for older clients.
        skillRoadmap,
        totalSkills: missingSkills.length,
        totalSteps,
        source,
        requiredSkills,
        requiredSkillsSource,
        roleSkillsModel,
      },
    });
  } catch (err) {
    console.error("generateRoadmap error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Could not generate your roadmap. Please try again.",
    });
  }
}

module.exports = { uploadResume, generateRoadmap };
