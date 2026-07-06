const express=require("express");

const router=express.Router();

const {
    contractorDashboard
}=require("../controllers/dashboardController");

const {
    verifyToken
}=require("../middlewares/auth.middleware");

const {
    authorizeRoles
}=require("../middlewares/role.middleware");

router.get(
    "/contractor",
    verifyToken,
    authorizeRoles(
        "CONTRACTOR",
    ),
    contractorDashboard
);

module.exports=router;