const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
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

    skillName: {
      type: String,
      required: true,
      trim: true,
    },

    skillCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    defaultDailyWage: {
      type: Number,
      required: true,
    },

    otRatePerHour: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Skill", skillSchema);