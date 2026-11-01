const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SALT_ROUNDS = 12;

/* -------------------------------------------------------------------------
   POST /api/auth/register
   ------------------------------------------------------------------------- */
async function registerUser(req, res) {
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  const errors = {};
  if (!name) errors.name = "Name is required.";
  else if (name.length > 80) errors.name = "Name must be under 80 characters.";

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Password is required.";
  else if (password.length < 8) errors.password = "Use at least 8 characters.";
  else if (password.length > 200) errors.password = "Password must be under 200 characters.";

  if (Object.keys(errors).length) {
    return res.status(400).json({
      success: false,
      message: "Please check the highlighted fields.",
      errors,
    });
  }

  try {
    const existing = await User.findOne({ email }).lean();
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists.",
        errors: { email: "This email is already registered." },
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        skills: user.skills || [],
        targetRole: user.targetRole || "",
        resumeSkills: user.resumeSkills || [],
      },
    });
  } catch (err) {
    // Duplicate key race: two registrations for the same email at once.
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with that email already exists.",
        errors: { email: "This email is already registered." },
      });
    }

    console.error("registerUser error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Could not create the account. Please try again.",
    });
  }
}

/* -------------------------------------------------------------------------
   POST /api/auth/login
   ------------------------------------------------------------------------- */
async function loginUser(req, res) {
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  try {
    // The schema declares password with `select: false`, so it is excluded
    // from every query by default. `+password` re-includes it for this query.
    // Without it, user.password is undefined and bcrypt.compare throws
    // "Illegal arguments: string, undefined".
    const user = await User.findOne({ email }).select("+password");

    // Unknown email, or a document saved before the field existed.
    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in .env");
      return res.status(500).json({
        success: false,
        message: "Server configuration error.",
      });
    }

    const token = jwt.sign(
      { id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        skills: user.skills || [],
        targetRole: user.targetRole || "",
        resumeSkills: user.resumeSkills || [],
      },
    });
  } catch (err) {
    console.error("loginUser error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Could not log you in. Please try again.",
    });
  }
}

module.exports = { registerUser, loginUser };
