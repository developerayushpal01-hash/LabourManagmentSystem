const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      enum: [
        "SUPER_ADMIN",
        "CONTRACTOR",
        "SUPERVISOR",
        "ACCOUNTANT",
      ],
    },
    sequence: {
        type: Number,
        default: 100000,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Counter", counterSchema);