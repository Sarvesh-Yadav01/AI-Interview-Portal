function getMailer() {
  try {
    return require("nodemailer");
  } catch (error) {
    return null;
  }
}

function hasSmtpConfig() {
  const user = String(process.env.SMTP_USER || "");
  const pass = String(process.env.SMTP_PASS || "");
  return Boolean(
    process.env.SMTP_HOST &&
      user &&
      pass &&
      user !== "your_email@gmail.com" &&
      pass !== "your_gmail_app_password"
  );
}

async function sendMail({ to, subject, text }) {
  if (!to) {
    return { sent: false, reason: "Missing recipient email." };
  }

  const nodemailer = getMailer();

  if (!nodemailer || !hasSmtpConfig()) {
    console.log(`[email skipped] To: ${to} | Subject: ${subject} | ${text}`);
    return { sent: false, reason: "SMTP or nodemailer is not configured." };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text
    });

    return { sent: true };
  } catch (error) {
    console.log(`[email failed] To: ${to} | Subject: ${subject} | ${error.message}`);
    return { sent: false, reason: error.message };
  }
}

exports.sendCustomMail = sendMail;

exports.sendSelectionMail = async (user, result) => {
  return sendMail({
    to: user.email,
    subject: "Congratulations - You are selected for the final round",
    text: `Dear ${user.name},\n\nCongratulations. You scored ${result.score}% in ${result.category}. You are selected for the final interview round. Please keep your camera and screen sharing ready for the next stage.\n\nRegards,\nAI Interview Portal`
  });
};

exports.sendOtpMail = async (user, otp) => {
  return sendMail({
    to: user.email,
    subject: "Your AI Interview Portal OTP",
    text: `Dear ${user.name},\n\nYour OTP is ${otp}. It is valid for 10 minutes.\n\nRegards,\nAI Interview Portal`
  });
};

exports.sendPasswordResetOtpMail = async (user, otp) => {
  return sendMail({
    to: user.email,
    subject: "Reset your AI Interview Portal password",
    text: `Dear ${user.name},\n\nUse this OTP to reset your password: ${otp}. It is valid for 10 minutes. If you did not request this, please ignore this email.\n\nRegards,\nAI Interview Portal`
  });
};

exports.sendViolationMail = async (user, reason) => {
  return sendMail({
    to: user.email,
    subject: "Interview ended due to security violation",
    text: `Dear ${user.name},\n\nYour interview was ended automatically because the proctoring system detected this issue: ${reason}.\n\nRegards,\nAI Interview Portal`
  });
};
