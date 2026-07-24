const express = require("express");
const router = express.Router();
const { register, verifyRegistrationOtp, login, logout, getMe, changePassword, forgotPassword, verifyOtp, resetPassword } = require("../controllers/authController");
const { verifyToken } = require("../middlewares/auth.middleware");


router.post("/register", register);
router.post("/register/verify-otp", verifyRegistrationOtp);

router.post("/login", login);

router.post("/logout", logout);

router.get("/me",verifyToken, getMe);

router.post("/change-password", verifyToken, changePassword);

router.post("/forgot-password", forgotPassword);

router.post("/verify-otp", verifyOtp);

router.post("/reset-password", resetPassword);


module.exports = router;

