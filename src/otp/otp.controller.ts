import type { Request, Response, NextFunction } from "express";
import User from "../users/user.Model.js";
import Otp from "./otp.model.js";
import createHttpError from "http-errors";
import { sendEmail, sendEmailWithRetry } from "../config/resend.js";
import { config } from "../config/index.js";
import { faliedEmailLogger, otpFailedEmailLogger } from "../config/logger.js";

// genrate opt
/**
 * 6 digit otp random number
 * 1. account verification on first time user resgistration .(user email id required)
 * 2. on password reset (userEmail is required without authmiddleware) ( user can request resend otp request maximum 3 per 6hrs)
 * 3. one controller for genrate 6 digit number.(auth middleware required )
 * todo: on successfull accountVerification verfication set worker / corn job for send weclome email
 */

const generateOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate input
    const { userEmailId } = req.body;

    if (!userEmailId) {
      return next(createHttpError(400, "Email is required"));
    }

    // 2. Find user
    const user = await User.findOne({ email: userEmailId }).select("-password");

    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    const userId = user._id.toString();

    // 3. Find existing OTP for this user
    const existingOtp = await Otp.findOne({ user: user._id });

    if (existingOtp) {
      // ===== CHECKing IF OTP IS EXPIRED =====
      const isExpired = existingOtp.isExpired();

      if (!isExpired) {
        // OTP still valid - apply cooldown rules

        // ===== LAYER 2: TIME-BASED COOLDOWN =====
        if (existingOtp.lastRequestTime) {
          const timeSinceLastRequest =
            Date.now() - existingOtp.lastRequestTime.getTime();

          // Progressive cooldown: 1min, 2min, 4min, 8min...
          const cooldownMs =
            existingOtp.attempts === 0
              ? 0
              : Math.pow(2, existingOtp.attempts - 1) * 60000;

          if (timeSinceLastRequest < cooldownMs) {
            const waitTimeMs = cooldownMs - timeSinceLastRequest;

            // Display in appropriate time unit
            if (waitTimeMs < 60000) {
              const waitSeconds = Math.ceil(waitTimeMs / 1000);
              return next(
                createHttpError(
                  429,
                  `Please wait ${waitSeconds} second${waitSeconds !== 1 ? "s" : ""} before requesting a new OTP`
                )
              );
            } else {
              const waitMinutes = Math.ceil(waitTimeMs / 60000);
              return next(
                createHttpError(
                  429,
                  `Please wait ${waitMinutes} minute${waitMinutes !== 1 ? "s" : ""} before requesting a new OTP`
                )
              );
            }
          }
        }
      }
      // If expired, skip cooldown check and continue

      // ===== LAYER 3: ATTEMPT COUNTER =====
      const windowElapsed =
        Date.now() - existingOtp.attemptWindowStart.getTime();
      const twoHoursMs = 2 * 60 * 60 * 1000;

      if (windowElapsed > twoHoursMs) {
        // 2-hour window expired - reset counter
        existingOtp.attempts = 0;
        existingOtp.attemptWindowStart = new Date();
      }

      if (existingOtp.attempts >= 6) {
        const resetTimeMs =
          existingOtp.attemptWindowStart.getTime() + twoHoursMs;
        const resetTime = new Date(resetTimeMs);

        return next(
          createHttpError(
            429,
            `Maximum attempts (6) reached. Please try again at ${resetTime.toLocaleTimeString()}`
          )
        );
      }

      // ===== GENERATE NEW OTP =====
      const newOtp = Otp.generateOtp(6);

      // ===== SEND EMAIL WITH RETRY =====
      const { success, messageId, attempts, error } = await sendEmailWithRetry(
        userEmailId,
        "Account Verification OTP",
        "email-verification-code-1",
        {
          COMPANY: config.companyName,
          VERIFICATION_CODE: newOtp,
        },
        3, // 3 retry attempts
        2000, // 2 second delay
        false, // Fixed delay (not exponential) for OTP
        userId,
        user.name
      );

      // ===== HANDLE EMAIL FAILURE =====
      if (!success) {
        otpFailedEmailLogger.error("OTP email failed after retries", {
          type: "OTP",
          email: userEmailId,
          userId: userId,
          userName: user.name,
          retryAttempts: attempts,
          failureReason: error,
          timestamp: new Date().toISOString(),
        });

        return next(
          createHttpError(
            500,
            "Failed to send OTP email. Please try again later."
          )
        );
      }

      // ===== UPDATE EXISTING OTP DOCUMENT =====
      existingOtp.otp = newOtp;
      existingOtp.otpCreatedAt = new Date();
      existingOtp.lastRequestTime = new Date();
      existingOtp.otpExpiredAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      existingOtp.attempts += 1;

      await existingOtp.save();

      // ===== SUCCESS RESPONSE =====
      const response: any = {
        success: true,
        message: `OTP sent successfully to ${userEmailId}`,
        messageId,
        expiresIn: "30 minutes",
      };

      // Return OTP in development mode only (for testing)
      if (config.nodeEnv === "development") {
        response.otp = newOtp;
        response.note = "OTP included for development only";
      }

      return res.status(200).json(response);
    } else {
      // ===== NO EXISTING OTP - CREATE NEW =====
      const newOtp = Otp.generateOtp(6);

      // ===== SEND EMAIL WITH RETRY =====
      const { success, messageId, attempts, error } = await sendEmailWithRetry(
        userEmailId,
        "Account Verification OTP",
        "email-verification-code-1",
        {
          COMPANY: config.companyName,
          VERIFICATION_CODE: newOtp,
        },
        3,
        2000,
        false,
        userId,
        user.name
      );

      // ===== HANDLE EMAIL FAILURE =====
      if (!success) {
        otpFailedEmailLogger.error("OTP email failed for new user", {
          type: "OTP",
          email: userEmailId,
          userId: userId,
          userName: user.name,
          retryAttempts: attempts,
          failureReason: error,
          timestamp: new Date().toISOString(),
        });

        return next(
          createHttpError(
            500,
            "Failed to send OTP email. Please try again later."
          )
        );
      }

      // ===== CREATE NEW OTP DOCUMENT =====
      await Otp.create({
        user: user._id,
        otp: newOtp,
        otpCreatedAt: new Date(),
        otpExpiredAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        attempts: 1,
        attemptWindowStart: new Date(),
        lastRequestTime: new Date(),
      });

      // ===== SUCCESS RESPONSE =====
      const response: any = {
        success: true,
        message: `OTP sent successfully to ${userEmailId}`,
        messageId,
        expiresIn: "30 minutes",
      };

      // Return OTP in development mode only (for testing)
      if (config.nodeEnv === "development") {
        response.otp = newOtp;
        response.note = "OTP included for development only";
      }

      return res.status(201).json(response);
    }
  } catch (error) {
    return next(
      createHttpError(500, "Internal server error for genrating OTP")
    );
  }
};

/**
 * Verify OTP
 *
 * Validates user-provided OTP against stored hash
 * Deletes OTP document on successful verification
 */
const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userEmailId, otp } = req.body;

    // Validate input
    if (!userEmailId || !otp) {
      return next(createHttpError(400, "Email and OTP are required"));
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return next(createHttpError(400, "Invalid OTP format. Must be 6 digits"));
    }

    // Find user
    const user = await User.findOne({ email: userEmailId });
    if (!user) {
      return next(createHttpError(404, "User not found"));
    }

    // Find OTP document
    const otpDoc = await Otp.findOne({ user: user._id });
    if (!otpDoc) {
      return next(
        createHttpError(404, "No OTP found. Please request a new one")
      );
    }

    // Check if expired
    if (otpDoc.isExpired()) {
      // Delete expired OTP
      await Otp.deleteOne({ _id: otpDoc._id });
      return next(
        createHttpError(400, "OTP has expired. Please request a new one")
      );
    }

    // Compare OTP
    const isValid = await otpDoc.compareOtp(otp);

    if (!isValid) {
      return next(createHttpError(400, "Invalid OTP. Please try again"));
    }

    // OTP verified successfully - delete the document
    await Otp.deleteOne({ _id: otpDoc._id });

    // Update user's mail verification status
    // await User.updateOne({ _id: user._id }, { isVerified: true });
    await User.updateOne({ _id: user._id }, { isMailVerified: true });
    const userId = user._id.toString();
    // WELCOME EMAIL SEND HERE .
    // TODO: IF FAILS CREATE A WORKER TO SEND WELCOME EMAIL WITH RETRY (3 ATTEMPTS) AND LOG FAILURE IN OTP FAILED EMAIL LOGGER
    const { success, messageId, error } = await sendEmail(
      userEmailId,
      "Welcome on board",
      "welcome-email",
      {
        COMPANY: config.companyName,
        USER_NAME: user.name,
      },
      0,
      userId,
      user.name
    );
    if (!success) {
      faliedEmailLogger.error("OTP email failed for new user", {
        type: "OTP",
        email: userEmailId,
        userId: userId,
        userName: user.name,
        retryAttempts: 0,
        failureReason: error,
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      userId: userId,
    });
  } catch (error) {
    next(error);
  }
};

export {
  // genrateOtpForAccountVerification
  generateOtp,
  verifyOtp,
};
