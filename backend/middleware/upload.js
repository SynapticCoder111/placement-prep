const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");

// <backend>/uploads — created automatically on first run.
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(req, file, cb) {
    // Never trust the client's filename; generate a unique one.
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    cb(null, `resume-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const isPdfExtension = path.extname(file.originalname).toLowerCase() === ".pdf";
  const isPdfMime = file.mimetype === "application/pdf";

  if (!isPdfExtension || !isPdfMime) {
    const err = new Error("Only PDF files are allowed.");
    err.code = "INVALID_FILE_TYPE";
    return cb(err);
  }

  cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter,
});

/**
 * Accepts one PDF in the multipart field named "resume".
 * Converts multer failures into JSON responses.
 */
function uploadResumePdf(req, res, next) {
  upload.single("resume")(req, res, (err) => {
    if (!err) return next();

    if (err.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed.",
      });
    }

    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "The PDF must be 5 MB or smaller.",
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "Unexpected file field. Send the PDF as 'resume'.",
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }

    return next(err);
  });
}

module.exports = { uploadResumePdf, UPLOAD_DIR, MAX_FILE_SIZE };
