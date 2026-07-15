const mongoose = require("mongoose");

const payrollSettingSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  basicPercentage: { type: Number, default: 40, min: 0, max: 100 },
  hraPercentage: { type: Number, default: 20, min: 0, max: 100 },
  allowanceCalculationMode: { type: String, enum: ["REMAINING", "FIXED", "PERCENTAGE"], default: "REMAINING" },
  allowanceValue: { type: Number, default: 0, min: 0 },
  overtimeRate: { type: Number, default: 120, min: 0 },
  pfEmployeePercent: { type: Number, default: 12, min: 0 },
  pfEmployerPercent: { type: Number, default: 12, min: 0 },
  employeePFPercentage: { type: Number, default: 12, min: 0 },
  employerPFPercentage: { type: Number, default: 12, min: 0 },
  pfWageCeilingEnabled: { type: Boolean, default: false },
  pfWageCeiling: { type: Number, default: 15000, min: 0 },
  esicEmployeePercent: { type: Number, default: 0.75, min: 0 },
  esicEmployerPercent: { type: Number, default: 3.25, min: 0 },
  employeeESICPercentage: { type: Number, default: 0.75, min: 0 },
  employerESICPercentage: { type: Number, default: 3.25, min: 0 },
  esicWageCeilingEnabled: { type: Boolean, default: false },
  esicWageCeiling: { type: Number, default: 21000, min: 0 },
  hraType: { type: String, enum: ["PERCENT", "FIXED"], default: "PERCENT" },
  hraValue: { type: Number, default: 20, min: 0 },
  otherAllowanceType: { type: String, enum: ["PERCENT", "FIXED"], default: "FIXED" },
  otherAllowanceValue: { type: Number, default: 0, min: 0 },
  isPFEnabled: { type: Boolean, default: true },
  isESICEnabled: { type: Boolean, default: true },
  isPaidLeaveEnabled: { type: Boolean, default: false },
  isPaidHolidayEnabled: { type: Boolean, default: false },
  isPaidWeeklyOffEnabled: { type: Boolean, default: false },
  allowNegativeSalary: { type: Boolean, default: false },
  roundOffSalary: { type: Boolean, default: true },
  salaryCycle: { type: String, enum: ["CALENDAR_DAYS", "FIXED_30_DAYS", "WORKING_DAYS", "DAILY", "WEEKLY", "MONTHLY"], default: "CALENDAR_DAYS" },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

payrollSettingSchema.index({ companyId: 1, contractorId: 1 }, { unique: true });
module.exports = mongoose.model("PayrollSetting", payrollSettingSchema);

