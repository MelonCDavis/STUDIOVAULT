const express = require("express");
const {
  getConsultationSettings,
  updateConsultationSettings,
} = require("./consultationSettings.controller");

const router = express.Router();

function requireStaffRole(req, res, next) {
  const allowedRoles = ["ARTIST", "MANAGER", "OWNER"];

  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
}

router.get("/", requireStaffRole, getConsultationSettings);
router.patch("/", requireStaffRole, updateConsultationSettings);

module.exports = router;