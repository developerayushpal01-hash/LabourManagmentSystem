const express = require("express");
const router = express.Router();

const {
  createLabourPayment,
  getLabourPayments,
  getPaymentsByLabour,
  updateLabourPayment,
  deleteLabourPayment,
} = require("../controllers/labourPaymentController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.post(
  "/create",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  createLabourPayment
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT", "SUPERVISOR"),
  getLabourPayments
);

router.get(
  "/labour/:labourId",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT", "SUPERVISOR"),
  getPaymentsByLabour
);

router.put(
  "/:id",
  verifyToken,
  authorizeRoles("CONTRACTOR", "ACCOUNTANT"),
  updateLabourPayment
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("CONTRACTOR"),
  deleteLabourPayment
);

module.exports = router;