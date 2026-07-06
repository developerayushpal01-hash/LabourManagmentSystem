const express = require("express");
const router = express.Router();

const {
  calculateSalary,
  calculateLabourSalary,
  paySalary,
} = require("../controllers/salaryController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.get(
  "/calculate",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  calculateSalary
);

router.get(
  "/labour/:labourId",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  calculateLabourSalary
);

router.post(
  "/pay",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  paySalary
);

// router.get(
//   "/payments",
//   verifyToken,
//   authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
//   getSalaryPayments
// );

module.exports = router;