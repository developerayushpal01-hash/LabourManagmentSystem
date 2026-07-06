const express = require("express");
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeUserStatus,
} = require("../controllers/userController");

const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");

const router = express.Router();

  
router.post("/create-user", verifyToken, authorizeRoles("CONTRACTOR"), createUser);
router.get("/get-users", verifyToken,authorizeRoles("CONTRACTOR"), getUsers);
router.get("/:id", verifyToken,authorizeRoles("CONTRACTOR"), getUserById);
router.put("/update/:id", verifyToken,authorizeRoles("CONTRACTOR"), updateUser);
router.delete("/delete/:id", verifyToken,authorizeRoles("CONTRACTOR"), deleteUser);
router.patch("/:id/status", verifyToken,authorizeRoles("CONTRACTOR"), changeUserStatus);

module.exports = router;