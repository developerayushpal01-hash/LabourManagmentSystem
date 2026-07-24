const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  mobile: { type: String, required: true, trim: true },
  registrationData: { type: mongoose.Schema.Types.Mixed, required: true },
  otpHash: { type: String, required: true },
  otpExpiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("PendingRegistration", schema);
