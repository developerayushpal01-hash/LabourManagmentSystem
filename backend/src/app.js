const express = require("express");
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






const app = express();

app.use(express.json());
app.use(cookieParser());

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

module.exports = app;