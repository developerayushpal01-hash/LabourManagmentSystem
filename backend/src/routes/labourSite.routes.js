const express = require("express");
const router = express.Router();

const {
  assignLabourToSite,
  getAssignments,
  getAssignmentsBySite,
  getAssignmentsByLabour,
  changeAssignmentStatus,
  deleteAssignment,
} = require("../controllers/labourSiteController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.post(
  "/assign",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR"),
  assignLabourToSite
);

router.get(
  "/",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  getAssignments
);

router.get(
  "/site/:siteId",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  getAssignmentsBySite
);

router.get(
  "/labour/:labourId",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
  getAssignmentsByLabour
);

router.patch(
  "/:id/status",
  verifyToken,
  authorizeRoles("CONTRACTOR", "SUPERVISOR"),
  changeAssignmentStatus
);

router.delete(
  "/:id",
  verifyToken,
  authorizeRoles("CONTRACTOR"),
  deleteAssignment
);

module.exports = router;