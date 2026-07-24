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


    qrCode: { type: String, default: null },
    photoUrl: { type: String, trim: true, default: null },
    aadhaarNumber: { type: String, trim: true, default: null, match: [/^\d{12}$/, "Aadhaar number must contain exactly 12 digits"] },
    panNumber: { type: String, trim: true, uppercase: true, default: null, match: [/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN number"] },
    bankAccountNumber: { type: String, trim: true, default: null, match: [/^\d{9,18}$/, "Bank account number must contain 9 to 18 digits"] },
    ifscCode: { type: String, trim: true, uppercase: true, default: null, match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"] },
    emergencyContact: {
      name: { type: String, trim: true, default: "" },
      relation: { type: String, trim: true, default: "" },
      mobile: { type: String, trim: true, default: "", match: [/^$|^\d{10}$/, "Emergency mobile must contain exactly 10 digits"] },
    },
    joiningDate: { type: Date, default: Date.now },
    resignationDate: { type: Date, default: null },
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

labourSchema.index({ companyId: 1, contractorId: 1, aadhaarNumber: 1 }, { unique: true, partialFilterExpression: { aadhaarNumber: { $type: "string" } } });
labourSchema.index({ companyId: 1, contractorId: 1, panNumber: 1 }, { unique: true, partialFilterExpression: { panNumber: { $type: "string" } } });
labourSchema.index({ companyId: 1, contractorId: 1, pfUanNumber: 1 }, { unique: true, partialFilterExpression: { pfUanNumber: { $type: "string" } } });
labourSchema.index({ companyId: 1, contractorId: 1, esicIpNumber: 1 }, { unique: true, partialFilterExpression: { esicIpNumber: { $type: "string" } } });

module.exports = mongoose.model("Labour", labourSchema);



