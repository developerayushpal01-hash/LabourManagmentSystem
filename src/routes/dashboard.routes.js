const express=require("express");

const router=express.Router();

const {
  contractorDashboard,
  attendanceChart,
  salaryChart,
  paymentChart,
  siteLabourChart,
} = require("../controllers/dashboardController");

const {
    verifyToken
}=require("../middlewares/auth.middleware");

const {
    authorizeRoles
}=require("../middlewares/role.middleware");

router.get("/contractor", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"), contractorDashboard);
router.get("/attendance-chart", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"), attendanceChart);
router.get("/salary-chart", verifyToken, authorizeRoles("CONTRACTOR", "ACCOUNTANT"), salaryChart);
router.get("/payment-chart", verifyToken, authorizeRoles("CONTRACTOR", "ACCOUNTANT"), paymentChart);
router.get("/site-labour-chart", verifyToken, authorizeRoles("CONTRACTOR", "SUPERVISOR", "ACCOUNTANT"), siteLabourChart);

module.exports=router;