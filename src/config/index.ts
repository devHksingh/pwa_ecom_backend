import { config as conf } from "dotenv";

conf();

const _config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15d",
};

export const config = Object.freeze(_config);
