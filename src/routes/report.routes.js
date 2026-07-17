const express = require("express");
const router = express.Router();

const {
  dailyAttendanceReport,
  monthlyAttendanceReport,
  labourWiseReport,
  siteWiseReport,
  paymentReport,
} = require("../controllers/reportController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.get(
  "/attendance/daily",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  dailyAttendanceReport
);

router.get(
  "/attendance/monthly",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  monthlyAttendanceReport
);

router.get(
  "/labour-wise/:labourId",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  labourWiseReport
);

router.get(
  "/site-wise/:siteId",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  siteWiseReport
);

router.get(
  "/payments",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  paymentReport
);

module.exports = router;