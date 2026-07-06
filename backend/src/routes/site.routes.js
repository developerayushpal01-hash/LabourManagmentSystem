const express = require("express");
const router = express.Router();

const {
  createSite,
  getSites,
  getSiteById,
  updateSite,
  changeSiteStatus,
  deleteSite,
} = require("../controllers/siteController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

// router.post(
//   "/create",
//   verifyToken,
//   authorizeRoles("CONTRACTOR", "SUPERVISOR"),
//   createSite
// );

// router.get(
//   "/",
//   verifyToken,
//   authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
//   getSites
// );

// router.get(
//   "/:id",
//   verifyToken,
//   authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"),
//   getSiteById
// );

// router.put(
//   "/:id",
//   verifyToken,
//   authorizeRoles("CONTRACTOR", "SUPERVISOR"),
//   updateSite
// );

// router.patch(
//   "/:id/status",
//   verifyToken,
//   authorizeRoles("CONTRACTOR", "SUPERVISOR"),
//   changeSiteStatus
// );

// router.delete(
//   "/:id",
//   verifyToken,
//   authorizeRoles("CONTRACTOR"),
//   deleteSite
// );


router.post("/create", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR"), createSite);

router.get("/get-sites", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"), getSites);

router.get("/get-site/:id", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"), getSiteById);

router.put("/update/:id", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR"), updateSite);

router.patch("/:id/status", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR"), changeSiteStatus);

router.delete("/delete/:id", verifyToken, authorizeRoles("CONTRACTOR"), deleteSite);

module.exports = router;