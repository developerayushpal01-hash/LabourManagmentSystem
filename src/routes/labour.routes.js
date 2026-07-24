const express = require("express");
const router = express.Router();

const {
  createLabour,
  getLabours,
  getLabourById,
  updateLabour,
  changeLabourStatus,
  deleteLabour,
} = require("../controllers/labourController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { uploadLabourPhoto } = require("../middlewares/labourPhoto.middleware");

router.post("/create", verifyToken, authorizeRoles("CONTRACTOR"), uploadLabourPhoto, createLabour);

router.get("/get-labours", verifyToken, authorizeRoles("CONTRACTOR"), getLabours);

router.get("/get-labour/:id", verifyToken, authorizeRoles("CONTRACTOR"), getLabourById);

router.put("/update/:id", verifyToken, authorizeRoles("CONTRACTOR"), uploadLabourPhoto, updateLabour);

router.patch("/:id/status", verifyToken, authorizeRoles("CONTRACTOR"), changeLabourStatus);

router.delete("/delete/:id", verifyToken, authorizeRoles("CONTRACTOR"), deleteLabour);

module.exports = router;

