const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.routes");
const companyRotes = require('./routes/company.routes')
const supervisorRotes = require('./routes/supervisor.routes')
const userRoutes = require("./routes/user.routes");
const skillRoutes = require("./routes/skill.routes");
const labourRoutes = require("./routes/labour.routes");


const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use("/api/company", companyRotes);

app.use("/api/supervisors", supervisorRotes);

app.use("/api/users", userRoutes);

app.use("/api/skills", skillRoutes);

app.use("/api/labours", labourRoutes);


module.exports = app;