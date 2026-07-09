const express = require("express");
const router = express.Router();

const {
  calculateSalary,
  calculateLabourSalary,
  generateSalarySlip,
  generateAllSalarySlips,
  paySalary,
} = require("../controllers/salaryController");

const {
  downloadSalarySlipPdf,
} = require("../controllers/salarySlipPdfController");

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
  "/generate-slip",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  generateSalarySlip
);

router.post(
  "/generate-slips",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  generateAllSalarySlips
);

router.post(
  "/pay",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  paySalary
);

router.get(
  "/slip/:id/pdf",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT", "SUPERVISOR"),
  downloadSalarySlipPdf
);

module.exports = router;