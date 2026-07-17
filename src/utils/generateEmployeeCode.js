const Counter = require("../models/Counter");

const prefixes = {
  SUPER_ADMIN: "ADM",
  CONTRACTOR: "CON",
  SUPERVISOR: "SUP",
  ACCOUNTANT: "ACC",
};

const generateEmployeeCode = async (role) => {
  const counter = await Counter.findOneAndUpdate(
    { type: role },
    { $inc: { sequence: 1 } },
    {
      new: true,
      upsert: true,
    }
  );

  const prefix = prefixes[role];

  return `${prefix}-${String(counter.sequence).padStart(6, "0")}`;
};

module.exports = generateEmployeeCode;