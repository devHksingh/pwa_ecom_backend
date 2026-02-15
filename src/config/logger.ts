import winston, { format } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { config } from "./index.js";

const { combine, prettyPrint, timestamp, json } = format;

/**
 * In failed emails log file contains:
 * welcome email,
 * password reset email,
 *  event reminder email, and any other email that failed to send due to errors.
 * NOT include OTP failure log beacuse it store separately in otp-failed-email log file, and it will be used for monitoring and alerting purpose.
 * Permanetly falied log (eamils that falied even after corn retries)
 */

//1. Combined /Info log with rotaion file
const combiedTransport = new DailyRotateFile({
  filename: "logs/combined-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m", // NEW file will be created when the log file size exceeds 20 mb
  maxFiles: "30d", // Log files older than 30 days will be automatically deleted
  format: combine(timestamp(), json()),
  level: "info",
});
//2. Error log with rotaion file (combined all error log)
const errorTransport = new DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "10m", // NEW file will be created when the log file size exceeds 10 mb
  maxFiles: "90d", // Log files older than 90 days will be automatically deleted
  format: combine(timestamp(), json()),
  level: "error",
});

// 3. warnlog with rotaion file (combined all warn log)
const warnTransport = new DailyRotateFile({
  filename: "logs/warn-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "10m", // NEW file will be created when the log file size exceeds 10 mb
  maxFiles: "60d", // Log files older than 60 days will be automatically deleted
  format: combine(timestamp(), json()),
  level: "warn",
});

// 4. Failed email log with rotaion file
const faliedEmailTransport = new DailyRotateFile({
  filename: "logs/failed-email-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "10m", // NEW file will be created when the log file size exceeds 10 mb
  maxFiles: "60d", // Log files older than 60 days will be automatically deleted
  format: combine(timestamp(), json()),
  level: "error",
});

// 5. OTP failed email log with rotaion file
const otpFailedEmailTransport = new DailyRotateFile({
  filename: "logs/otp-failed-email-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "5m", // NEW file will be created when the log file size exceeds 5 mb
  maxFiles: "30d", // Log files older than 30 days will be automatically deleted
  format: combine(timestamp(), json()),
  level: "error",
});

// 6. Permanently Failed Log (emails that failed even after cron retries) with rotaion file
const permanentlyFailedEmailTransport = new DailyRotateFile({
  filename: "logs/permanently-failed-email-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "10m", // NEW file will be created when the log file size exceeds 10 mb
  maxFiles: "90d", // Log files older than 90 days will be automatically deleted
  format: combine(timestamp(), json()),
  level: "error",
});

const logger = winston.createLogger({
  level: "info",
  format: combine(json(), timestamp(), prettyPrint()),
  defaultMeta: {
    serviceName: "event-backend",
  },

  transports: [
    new winston.transports.Console({
      level: "info",

      format: combine(timestamp(), json(), prettyPrint()),
      silent: config.nodeEnv === "production", // Disable console logging in production
    }),
    combiedTransport,
    errorTransport,
    warnTransport,
  ],
});

// separately add failed email log transport and OTP failed email log transport and permanently failed email log transport to logger
export const faliedEmailLogger = winston.createLogger({
  format: combine(json(), timestamp()),
  defaultMeta: {
    serviceName: "failed-email-service",
  },
  transports: [faliedEmailTransport],
});

export const otpFailedEmailLogger = winston.createLogger({
  format: combine(json(), timestamp()),
  defaultMeta: {
    serviceName: "otp-failed-email-service",
  },
  transports: [otpFailedEmailTransport],
});

export const permanentlyFailedEmailLogger = winston.createLogger({
  format: combine(json(), timestamp()),
  defaultMeta: {
    serviceName: "permanently-failed-email-service",
  },
  transports: [permanentlyFailedEmailTransport],
});

export default logger;
