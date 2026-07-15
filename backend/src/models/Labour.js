const mongoose = require("mongoose");

const labourSchema = new mongoose.Schema(
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

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },

    labourCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d+$/, "Mobile number must contain digits only"],
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      required: true,
    },

    dob: {
      type: Date,
      default: null,
    },

    address: {
      type: String,
      trim: true,
    },

    dailyWage: {
      type: Number,
      default: null,
    },

    overtimeRate: { type: Number, default: null, min: 0 },
    isPFApplicable: { type: Boolean, default: false },
    pfUanNumber: { type: String, trim: true, default: null, match: [/^\d{12}$/, "PF UAN number must contain exactly 12 digits"] },
    isESICApplicable: { type: Boolean, default: false },
    esicIpNumber: { type: String, trim: true, default: null, match: [/^\d{10}$/, "ESIC IP number must contain exactly 10 digits"] },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "BLOCKED"],
      default: "ACTIVE",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

labourSchema.index({ companyId: 1, contractorId: 1, pfUanNumber: 1 }, { unique: true, partialFilterExpression: { pfUanNumber: { $type: "string" } } });
labourSchema.index({ companyId: 1, contractorId: 1, esicIpNumber: 1 }, { unique: true, partialFilterExpression: { esicIpNumber: { $type: "string" } } });

module.exports = mongoose.model("Labour", labourSchema);


