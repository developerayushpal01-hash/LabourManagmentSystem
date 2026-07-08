const mongoose = require("mongoose");

const payrollSettingSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    contractorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pfEmployeePercent: {
      type: Number,
      default: 12,
    },

    pfEmployerPercent: {
      type: Number,
      default: 13,
    },

    esicEmployeePercent: {
      type: Number,
      default: 0.75,
    },

    esicEmployerPercent: {
      type: Number,
      default: 3.25,
    },

    hraType: {
      type: String,
      enum: ["PERCENT", "FIXED"],
      default: "PERCENT",
    },

    hraValue: {
      type: Number,
      default: 20,
    },

    otherAllowanceType: {
      type: String,
      enum: ["PERCENT", "FIXED"],
      default: "FIXED",
    },

    otherAllowanceValue: {
      type: Number,
      default: 0,
    },

    isPFEnabled: {
      type: Boolean,
      default: true,
    },

    isESICEnabled: {
      type: Boolean,
      default: true,
    },

    roundOffSalary: {
      type: Boolean,
      default: true,
    },

    salaryCycle: {
      type: String,
      enum: ["DAILY", "WEEKLY", "MONTHLY"],
      default: "MONTHLY",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

payrollSettingSchema.index(
  { companyId: 1, contractorId: 1 },
  { unique: true }
);




module.exports = mongoose.model("PayrollSetting", payrollSettingSchema);