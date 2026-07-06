const mongoose = require("mongoose");

const labourPaymentSchema = new mongoose.Schema(
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

    labourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Labour",
      required: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    month: {
      type: Number,
      default: null,
    },

    year: {
      type: Number,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    paymentType: {
      type: String,
      enum: ["ADVANCE", "SALARY", "BONUS", "DEDUCTION"],
      required: true,
    },

    paymentMode: {
      type: String,
      enum: ["CASH", "BANK", "UPI"],
      default: "CASH",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LabourPayment", labourPaymentSchema);