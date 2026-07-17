const express = require("express");
const router = express.Router();

const {
  calculateSalary,
  calculateLabourSalary,
  generateSalarySlip,
  generateAllSalarySlips,
  paySalary,
} = require("../controllers/salarySlipController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");


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


module.exports = router;