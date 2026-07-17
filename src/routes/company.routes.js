const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

const {
  getCompanyProfile,
  updateCompanyProfile,
} = require("../controllers/companyController");

router.get(
  "/profile",
  verifyToken,
  authorizeRoles("CONTRACTOR"),
  getCompanyProfile
);

router.put(
  "/profile",
  verifyToken,
  authorizeRoles("CONTRACTOR"),
  updateCompanyProfile
);

module.exports = router;