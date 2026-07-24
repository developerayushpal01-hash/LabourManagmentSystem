const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const companyRotes = require('./routes/company.routes')
const userRoutes = require("./routes/user.routes");
const skillRoutes = require("./routes/skill.routes");
const labourRoutes = require("./routes/labour.routes");
const salaryRoutes = require("./routes/salary.routes");
const siteRoutes = require("./routes/site.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const labourSiteRoutes = require("./routes/labourSite.routes");
const labourPaymentRoutes = require("./routes/labourPayment.routes");
const dashboardRoutes=require("./routes/dashboard.routes");
const reportRoutes = require("./routes/report.routes");
const exportRoutes = require("./routes/export.routes");
const payrollSettingRoutes = require("./routes/payrollSetting.routes");
const salarySlipRoutes = require("./routes/salarySlip.routes")
const siteInvoiceRoutes = require("./routes/siteInvoice.routes")
const superAdminRoutes = require("./routes/superAdmin.routes")
const subscriptionRoutes = require("./routes/subscription.routes")
const quotationRoutes = require("./routes/quotation.routes")
const notificationRoutes = require("./routes/notification.routes")
const cors = require("cors");





const app = express();

app.use(express.json());
app.use(cookieParser());

const frontendOrigin =process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use((req, res, next) => {
  if (req.headers.origin === frontendOrigin) {
    res.header("Access-Control-Allow-Origin", frontendOrigin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use("/api/auth", authRoutes);

app.use("/api/company", companyRotes);

app.use("/api/users", userRoutes);

app.use("/api/skills", skillRoutes);

app.use("/api/labours", labourRoutes);

app.use("/api/attendance", attendanceRoutes);

app.use("/api/salary", salaryRoutes);

app.use("/api/sites", siteRoutes);

app.use("/api/labour-site", labourSiteRoutes);

app.use("/api/labour-payments", labourPaymentRoutes);

app.use("/api/dashboard",dashboardRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/export", exportRoutes);

app.use("/api/payroll-settings", payrollSettingRoutes);

app.use("/api/salaryslip", salarySlipRoutes);

app.use("/api/site-invoices", siteInvoiceRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api/super-admin", superAdminRoutes);
app.use("/api/subscriptions", subscriptionRoutes);


module.exports = app;



