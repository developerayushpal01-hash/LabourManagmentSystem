const router = require("express").Router();
const controller = require("../controllers/subscriptionPlanController");
const { verifyToken } = require("../middlewares/auth.middleware");
const { authorizeRoles } = require("../middlewares/role.middleware");
const { paymentProofUpload } = require("../middlewares/paymentProof.middleware");
router.use(verifyToken, authorizeRoles("CONTRACTOR"));
router.get("/plans", controller.publicPlans);
router.get("/current", controller.current);
router.get("/payment-details", controller.paymentDetails);
router.post("/subscribe", controller.subscribe);
router.post("/submit-payment", (req, res, next) => paymentProofUpload(req, res, (error) => error ? res.status(400).json({ success: false, message: error.message }) : next()), controller.submitPayment);
module.exports = router;


