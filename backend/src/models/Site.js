const mongoose = require("mongoose");

const siteSchema = new mongoose.Schema(
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

    siteName: {
      type: String,
      required: true,
      trim: true,
    },

    siteCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },

    contactMobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d+$/, "Contact mobile must contain digits only"],
    },

    contactEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid contact email"],
    },

    clientGstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    addressLine: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    pincode: { type: String, trim: true, default: "", match: [/^\d{0,6}$/, "PIN code must contain up to 6 digits"] },
    billingCycleStartDay: { type: Number, default: 1, min: 1, max: 31 },
    billingCycleEndDay: { type: Number, default: 0, min: 0, max: 31 },

    projectValue: {
      type: Number,
      required: true,
      min: 0,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "COMPLETED"],
      default: "ACTIVE",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Site", siteSchema);

