import express from "express";
import { generateOtp, verifyOtp } from "./otp.controller.js";
import resend from "../config/resend.js";
import { config } from "../config/index.js";
import rateLimit from "express-rate-limit";

const otpRoute = express.Router();

// layer 1 rate limting

const otpGenerateRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many OTP request. please try again later ",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

// Limit OTP verification to 10 attempts per 15 minutes per IP
const otpVerifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many OTP verification attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
otpRoute.post("/generate", otpGenerateRateLimiter, generateOtp);
otpRoute.post("/verify", otpVerifyRateLimiter, verifyOtp);
otpRoute.post("/reset-password", otpGenerateRateLimiter, generateOtp); // Reuse generateOtp for password reset OTP generation

// // In otp.route.ts (temporary test)
// otpRoute.get("/test-email", async (req, res, next) => {
//     try {
//         console.log(config.fromEmail)
//         // Use raw Resend SDK to test
//         const { data, error } = await resend.emails.send({
//             from: config.fromEmail,
//             to: ["hksingh.dev@gmail.com"],  // Use YOUR email here
//             subject: "Test Email",
//             html: "<h1>Hello from Resend!</h1>"
//         });

//         if (error) {
//             return res.status(500).json({ error: error.message });
//         }

//         res.json({ success: true, messageId: data?.id });
//     } catch (error) {
//         next(error);
//     }
// });
// otpRoute.get("/test-template", async (req, res, next) => {
//     try {
//         // Check if template exists
//         const { data, error } = await resend.templates.get("email-verification-code");

//         if (error) {
//             return res.status(404).json({
//                 error: "Template not found",
//                 message: error.message
//             });
//         }

//         res.json({
//             success: true,
//             template: data
//         });
//     } catch (error) {
//         next(error);
//     }
// });

export default otpRoute;
