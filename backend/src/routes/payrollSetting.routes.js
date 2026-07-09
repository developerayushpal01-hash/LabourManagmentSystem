const express = require("express");
const router = express.Router();

const {
  createOrUpdatePayrollSetting,
  getPayrollSetting,
  updatePayrollSetting,
} = require("../controllers/payrollSettingController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.post(
  "/create",
  verifyToken,
  authorizeRoles("CONTRACTOR"),
  createOrUpdatePayrollSetting
);

router.get(
  "/get-payrollsetting",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  getPayrollSetting
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("CONTRACTOR"),
  updatePayrollSetting
);

module.exports = router;