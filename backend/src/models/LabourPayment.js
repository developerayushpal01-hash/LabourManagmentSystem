const mongoose = require("mongoose");

const labourPaymentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    contractorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    labourId: { type: mongoose.Schema.Types.ObjectId, ref: "Labour", required: true },
    labourNameSnapshot: { type: String, default: "" },
    labourCodeSnapshot: { type: String, default: "" },

    month: { type: Number, required: true },
    year: { type: Number, required: true },

    amount: { type: Number, required: true },

    paymentType: {
      type: String,
      enum: ["ADVANCE", "SALARY", "BONUS", "DEDUCTION", "INCENTIVE"],
      required: true,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "BANK", "UPI"],
      default: "CASH",
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    remarks: {
      type: String,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isAdjusted: { type: Boolean, default: false },
    adjustedSalaryId: { type: mongoose.Schema.Types.ObjectId, ref: "SalarySlip", default: null },
    adjustedAt: { type: Date, default: null },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabourPayment", labourPaymentSchema);

