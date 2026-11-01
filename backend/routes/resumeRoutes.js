const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { uploadResumePdf } = require("../middleware/upload");
const {
  uploadResume,
  generateRoadmap,
} = require("../controllers/resumeController");
const { analyzeGap } = require("../controllers/gapController");

const router = express.Router();

// Auth runs first, so unauthenticated requests never write a file to disk.
router.post("/upload", protect, uploadResumePdf, uploadResume);
router.post("/analyze", protect, analyzeGap);
router.post("/roadmap", protect, generateRoadmap);

module.exports = router;
