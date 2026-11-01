const User = require("../models/User");
const {
  resolveTargetRole,
  getJobSkills,
  analyzeRoleGap,
  detectRole,
} = require("../utils/skillExtractor");
const { resolveRoleSkills } = require("../utils/roleSkillGenerator");
const { analyzeSkillGapWithAI } = require("./aiController");

/**
 * Caches an AI/fallback profile on the user when they analyze a custom role
 * that predates the targetRoleSkills field.
 */
async function cacheRoleSkills(user, targetRole, profile) {
  if (!targetRole || !profile || profile.skills.length === 0) return;
  if (profile.source === "predefined" || profile.source === "stored") return;
  if (resolveTargetRole(user.targetRole) !== targetRole) return;
  if (Array.isArray(user.targetRoleSkills) && user.targetRoleSkills.length > 0) {
    return;
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        targetRoleSkills: profile.skills,
        targetRoleSkillsSource: profile.source,
      },
    }
  ).catch((err) => console.error("cacheRoleSkills error:", err.message));
}

/* -------------------------------------------------------------------------
   POST /api/resume/analyze  (protected)
   Body: { "jobDescription": "optional", "targetRole": "optional override" }

   Response contract:
   {
     matchPercentage,
     readinessScore,
     matched: string[],
     missing: string[],
     missingSkills: [{ skill, severity, reason }],
     roadmap: { month1: string[], month2: string[], month3: string[] }
   }
   ------------------------------------------------------------------------- */
async function analyzeGap(req, res) {
  const jobDescription =
    typeof req.body?.jobDescription === "string"
      ? req.body.jobDescription.trim()
      : "";
  const requestedRole =
    typeof req.body?.targetRole === "string" ? req.body.targetRole.trim() : "";

  try {
    const user = await User.findById(req.user.id).select(
      "resumeSkills skills targetRole targetRoleSkills targetRoleSkillsSource resumeText"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const resumeSkills =
      Array.isArray(user.resumeSkills) && user.resumeSkills.length > 0
        ? user.resumeSkills
        : Array.isArray(user.skills)
          ? user.skills
          : [];

    if (resumeSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Upload a resume before running a skill-gap analysis.",
      });
    }

    const targetRole =
      resolveTargetRole(requestedRole) || resolveTargetRole(user.targetRole);
    const detectedRole = detectRole(jobDescription);
    const analysisRole = targetRole || detectedRole || "";
    const analysisRoleLabel = analysisRole || "the target role";

    let requiredSkills = [];
    let requiredSkillsSource = "targetRole";
    let roleSkillsModel = null;
    let source = "targetRole";
    let jobSkills = [];

    // A custom JD takes priority when it contains recognizable skills.
    if (jobDescription) {
      jobSkills = getJobSkills(jobDescription);
      if (jobSkills.length > 0) {
        requiredSkills = jobSkills;
        requiredSkillsSource = "jobDescription";
        source = "jobDescription";
      }
    }

    // Fall back to the selected/detected role. Custom roles use the profile
    // generated at upload time (or generate one now for older accounts).
    if (requiredSkills.length === 0 && analysisRole) {
      const roleProfile = await resolveRoleSkills({
        role: analysisRole,
        user,
      });
      requiredSkills = roleProfile.skills;
      requiredSkillsSource = roleProfile.source;
      roleSkillsModel = roleProfile.model || null;
      source = "targetRole";
      await cacheRoleSkills(user, targetRole, roleProfile);
    }

    if (requiredSkills.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Select a target role or provide a job description with recognized skills.",
      });
    }

    const gap = analyzeRoleGap(resumeSkills, requiredSkills);

    // The deterministic gap stays authoritative; AI enriches severity,
    // reasons, summary and the month-by-month roadmap. If OpenAI is not
    // configured, this returns a complete rule-based analysis instead.
    const details = await analyzeSkillGapWithAI({
      role: analysisRoleLabel,
      resumeSkills,
      requiredSkills,
      resumeText: user.resumeText || "",
      gap,
    });

    return res.status(200).json({
      success: true,
      data: {
        // Required contract: matched, missing, matchPercentage, readinessScore.
        ...gap,
        missingSkills: details.missingSkills,
        missingSkillDetails: details.missingSkills,
        missingSkillNames: gap.missing,
        roadmap: details.roadmap,
        analysis: {
          summary: details.summary,
          source: details.source,
          model: details.model || null,
        },
        targetRole: analysisRole || null,
        requiredSkills,
        requiredSkillsSource,
        roleSkillsModel,
        source,
        jobSkills,
        resumeSkills,
        // Backwards-compatible aliases for the previous frontend.
        matchedSkills: gap.matched,
        extractedJdSkills: requiredSkills,
      },
    });
  } catch (err) {
    console.error("analyzeGap error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Could not analyse the skill gap. Please try again.",
    });
  }
}

module.exports = { analyzeGap };
