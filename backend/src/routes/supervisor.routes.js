const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

const { createSupervisor,} = require("../controllers/supervisorController");

router.post("/create-", verifyToken,authorizeRoles("CONTRACTOR"),createSupervisor);

module.exports = router;