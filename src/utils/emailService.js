const nodemailer = require("nodemailer");
const createTransporter = () => {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Email service is not configured. Missing: ${missing.join(", ")}`);
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT), secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
};
const sendOtpEmail = async ({ email, otp, purpose }) => {
  const registration = purpose === "registration";
  const action = registration ? "complete your registration" : "reset your password";
  await createTransporter().sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER, to: email,
    subject: registration ? "Verify your Kinetic LMS registration" : "Reset your Kinetic LMS password",
    text: `Your Kinetic LMS OTP is ${otp}. It is valid for 10 minutes. Do not share it.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;border:1px solid #e2e8f0;border-radius:16px"><h2 style="color:#312e81">Kinetic LMS verification</h2><p>Use this OTP to ${action}:</p><div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">${otp}</div><p style="color:#64748b">This code expires in 10 minutes. Do not share it with anyone.</p></div>`,
  });
};
module.exports = { sendOtpEmail };
