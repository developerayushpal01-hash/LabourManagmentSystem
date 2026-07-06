const express = require("express");
const router = express.Router();

const {
  createSkill,
  getSkills,
  updateSkill,
  deleteSkill,
} = require("../controllers/skillController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

router.post("/create", verifyToken, authorizeRoles("CONTRACTOR"), createSkill);

router.get("/get-skilles", verifyToken, authorizeRoles("CONTRACTOR"), getSkills);

router.put("/update/:id", verifyToken, authorizeRoles("CONTRACTOR"), updateSkill);

router.delete("/delete/:id", verifyToken, authorizeRoles("CONTRACTOR"), deleteSkill);

module.exports = router;