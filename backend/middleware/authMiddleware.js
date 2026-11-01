const jwt = require("jsonwebtoken");

/**
 * Requires `Authorization: Bearer <token>` and verifies the JWT.
 *
 * On success: req.user = { id } and next() is called.
 * On failure: a JSON error response is sent and the route never runs.
 */
function protect(req, res, next) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. Provide a Bearer token.",
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured in .env");
    return res.status(500).json({
      success: false,
      message: "Server configuration error.",
    });
  }

  const token = match[1].trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    req.user = { id: decoded.id };
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Your session has expired. Please log in again.",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }
}

module.exports = { protect };
