const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
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

    labourId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Labour",
      required: true,
    },

    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
    },

    siteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Site",
        default: null,
    },

    attendanceDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"],
      default: "PRESENT",
    },

    wageType: {
      type: String,
      enum: ["CUSTOM", "SKILL_BASED"],
      required: true,
    },

    wageAtThatDay: {
      type: Number,
      required: true,
    },

    overtimeHours: {
      type: Number,
      default: 0,
    },

    overtimeAmount: {
      type: Number,
      default: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },

    markedBy: {
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

attendanceSchema.index(
  { labourId: 1, attendanceDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);