const express = require("express");
const router = express.Router();


const {
  exportLabours,
  exportMonthlyAttendance,
  exportSalaryReport,
} = require("../controllers/exportController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.get(
  "/labours",
  verifyToken,
  authorizeRoles("CONTRACTOR"),
  exportLabours
);

router.get(
  "/attendance/monthly",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  exportMonthlyAttendance
);

router.get(
  "/salary",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  exportSalaryReport
);

module.exports = router;
