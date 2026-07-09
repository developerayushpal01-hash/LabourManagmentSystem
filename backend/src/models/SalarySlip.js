const mongoose = require("mongoose");

const salarySlipSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    labourId: { type: mongoose.Schema.Types.ObjectId, ref: "Labour", required: true },

    month: { type: Number, required: true },
    year: { type: Number, required: true },

    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    otherAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    overtimeAmount: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },

    pfEmployee: { type: Number, default: 0 },
    esicEmployee: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    otherDeduction: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },

    pfEmployer: { type: Number, default: 0 },
    esicEmployer: { type: Number, default: 0 },
    ctc: { type: Number, default: 0 },

    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID"],
      default: "PENDING",
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

salarySlipSchema.index(
  { labourId: 1, month: 1, year: 1, isDeleted: 1 },
  { unique: true }
);

module.exports = mongoose.model("SalarySlip", salarySlipSchema);