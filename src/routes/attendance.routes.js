const express = require("express");
const router = express.Router();

const {
  markAttendance,
  getTodayAttendance,
  getMonthlyAttendance,
  updateAttendance,
  deleteAttendance,
} = require("../controllers/attendanceController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.post("/mark", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR"), markAttendance);

router.get("/today", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR"), getTodayAttendance);

router.get("/monthly", verifyToken, authorizeRoles("CONTRACTOR" ,"SUPERVISOR"), getMonthlyAttendance);

router.put("/update/:id", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR"), updateAttendance);

router.delete("/delete/:id", verifyToken, authorizeRoles("CONTRACTOR"), deleteAttendance);

module.exports = router;