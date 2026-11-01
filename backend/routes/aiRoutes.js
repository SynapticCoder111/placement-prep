const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getInterviewQuestion,
  getInterviewStats,
  evaluateAnswer,
} = require("../controllers/aiController");

const router = express.Router();

router.get("/question", protect, getInterviewQuestion);
router.get("/stats", protect, getInterviewStats);
router.post("/evaluate", protect, evaluateAnswer);

module.exports = router;
