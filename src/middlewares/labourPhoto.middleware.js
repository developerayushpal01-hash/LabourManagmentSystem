const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(__dirname, "../../uploads/labours");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname).toLowerCase()}`),
});
const labourPhotoUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype) ? cb(null, true) : cb(new Error("Photo must be JPG, PNG or WEBP")),
});
const uploadLabourPhoto = (req, res, next) => {
  labourPhotoUpload.single("photo")(req, res, (error) => {
    if (error) return res.status(400).json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "Photo must be smaller than 2 MB" : error.message });
    next();
  });
};
module.exports = { uploadLabourPhoto };

