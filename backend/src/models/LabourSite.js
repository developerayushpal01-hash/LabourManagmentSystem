const mongoose = require("mongoose");

const labourSiteSchema = new mongoose.Schema(
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

    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Site",
      required: true,
    },

    labourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Labour",
      required: true,
    },

    supervisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedFrom: {
      type: Date,
      required: true,
    },

    assignedTo: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "COMPLETED", "REMOVED"],
      default: "ACTIVE",
    },

    assignedBy: {
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

labourSiteSchema.index(
  { labourId: 1, siteId: 1, status: 1 },
  { unique: true }
);

module.exports = mongoose.model("LabourSite", labourSiteSchema);