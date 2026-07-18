const router=require("express").Router(),c=require("../controllers/subscriptionPlanController"),{verifyToken}=require("../middlewares/auth.middleware"),{authorizeRoles}=require("../middlewares/role.middleware");
router.use(verifyToken,authorizeRoles("CONTRACTOR"));router.get("/plans",c.publicPlans);router.get("/current",c.current);router.post("/subscribe",c.subscribe);module.exports=router;
