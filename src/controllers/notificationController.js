const Notification = require("../models/PlatformNotification");
const audience = (req) => ({
  isDeleted: false,
  status: { $in: ["PUBLISHED", "SCHEDULED"] },
  scheduledAt: { $lte: new Date() },
  $and: [{ $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }] }],
  $or: [
    { targetType: "ALL" },
    { targetType: "COMPANY", companyId: req.user.companyId },
    { targetType: "ROLE", role: req.user.role },
    { targetType: "USER", userId: req.user._id },
  ],
});
exports.list = async (req, res) => {
  try { const data = await Notification.find(audience(req)).sort({ scheduledAt: -1 }).limit(30).lean(); res.json({ success: true, unread: data.filter(n => !n.readBy?.some(id => String(id) === String(req.user._id))).length, data: data.map(n => ({ ...n, isRead: n.readBy?.some(id => String(id) === String(req.user._id)) })) }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
exports.read = async (req, res) => {
  try { const data = await Notification.findOneAndUpdate({ _id: req.params.id, ...audience(req) }, { $addToSet: { readBy: req.user._id } }, { new: true }); if (!data) return res.status(404).json({ success: false, message: "Notification not found" }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
exports.readAll = async (req, res) => {
  try { await Notification.updateMany(audience(req), { $addToSet: { readBy: req.user._id } }); res.json({ success: true }); }
  catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
