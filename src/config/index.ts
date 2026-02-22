import { config as conf } from "dotenv";

conf();

const _config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15d",
  resendKey: process.env.RESEND_API_KEY || "",
  fromEmail: process.env.FROM_EMAIL || "",
  emailVerificationTemplateName:
    process.env.EMAIL_VERIFICATION_TEMPLATE_NAME || "email-verification-code",
  passwordResetTemplateName:
    process.env.PASSWORD_RESET_TEMPLATE_NAME || "password-reset-code",
  welcomeMessageTemplateName:
    process.env.WELCOME_MESSAGE_TEMPLATE_NAME || "welcome-message",
  companyName: process.env.COMPANY_NAME || "DUMMY_TEST_NAME",
};

// Validation
if (!_config.mongoUri) {
  throw new Error("MONGO_URI is required in environment variables");
}

if (!_config.jwtSecret) {
  throw new Error("JWT_SECRET is required in environment variables");
}

// Only validate email config if not in test environment
if (_config.nodeEnv !== "test") {
  if (!_config.resendKey) {
    throw new Error("RESEND_API_KEY is required in environment variables");
  }

  if (!_config.fromEmail) {
    throw new Error("FROM_EMAIL is required in environment variables");
  }
}

export const config = Object.freeze(_config);
