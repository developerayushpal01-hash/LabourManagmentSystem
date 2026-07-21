const mongoose = require("mongoose");
const schema = new mongoose.Schema({ key: { type: String, required: true, unique: true, trim: true }, value: { type: mongoose.Schema.Types.Mixed, required: true }, description: { type: String, default: "" }, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } }, { timestamps: true });
module.exports = mongoose.model("SystemSetting", schema);
